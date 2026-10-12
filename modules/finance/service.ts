import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { BusinessError } from "@/lib/action";
import { audit } from "@/lib/audit";
import { membersWithoutDue, type Category, dueDateFor, type EntryType, formatMoney, monthLabel, monthRange, type PaymentMethod, summarize } from "./rules";

const SETTING_DUE_AMOUNT = "finance.dueAmountCents";
const SETTING_DUE_DAY = "finance.dueDay";
export const DEFAULT_DUE_DAY = 10;

/** Valor e dia de vencimento padrão das mensalidades. O valor é null enquanto não for configurado. */
export async function getDueSettings(): Promise<{ amountCents: number | null; dueDay: number }> {
  const rows = await prisma.siteSetting.findMany({ where: { key: { in: [SETTING_DUE_AMOUNT, SETTING_DUE_DAY] } } });
  const value = (key: string) => rows.find((row) => row.key === key)?.value;
  const amount = Number(value(SETTING_DUE_AMOUNT));
  const day = Number(value(SETTING_DUE_DAY));
  return {
    amountCents: Number.isInteger(amount) && amount > 0 ? amount : null,
    dueDay: Number.isInteger(day) && day >= 1 && day <= 31 ? day : DEFAULT_DUE_DAY,
  };
}

export async function saveDueSettings(amountCents: number, dueDay: number, userId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    for (const [key, value] of [
      [SETTING_DUE_AMOUNT, String(amountCents)],
      [SETTING_DUE_DAY, String(dueDay)],
    ] as const) {
      await tx.siteSetting.upsert({ where: { key }, create: { key, value }, update: { value } });
    }
    await audit(
      { userId, action: "finance.dues.settings", entity: "MembershipDue", summary: `Definiu a mensalidade em ${formatMoney(amountCents)}, com vencimento no dia ${dueDay}`, after: { amountCents, dueDay } },
      tx,
    );
  });
}

export type EntryInput = {
  type: EntryType;
  category: Category;
  description: string;
  amountCents: number;
  occurredOn: Date;
  method: PaymentMethod;
  notes: string | null;
  matchId: string | null;
  agreementId: string | null;
  athleteId?: string | null;
  competitionId?: string | null;
  technicalStaffId?: string | null;
  payrollService?: string | null;
};

/** Cria um lançamento e o registro de auditoria. Pode participar de uma transação já aberta. */
export async function createEntry(input: EntryInput, userId: string, tx: Prisma.TransactionClient) {
  if (input.athleteId && !(await tx.athlete.findUnique({ where: { id: input.athleteId }, select: { id: true } }))) {
    throw new BusinessError("Jogador não encontrado.");
  }
  if (input.technicalStaffId && !(await tx.technicalStaff.findUnique({ where: { id: input.technicalStaffId }, select: { id: true } }))) {
    throw new BusinessError("Membro da comissão técnica não encontrado.");
  }
  if (input.competitionId && !(await tx.competition.findUnique({ where: { id: input.competitionId }, select: { id: true } }))) {
    throw new BusinessError("Campeonato não encontrado.");
  }
  if (input.matchId) {
    const match = await tx.match.findUnique({ where: { id: input.matchId }, select: { season: { select: { competitionId: true } } } });
    if (!match) throw new BusinessError("Partida não encontrada.");
    // A partida escolhida precisa ser do campeonato informado.
    if (input.competitionId && match.season.competitionId !== input.competitionId) {
      throw new BusinessError("A partida selecionada não pertence ao campeonato escolhido.");
    }
  }
  if (input.agreementId && !(await tx.financeAgreement.findUnique({ where: { id: input.agreementId }, select: { id: true } }))) {
    throw new BusinessError("Acordo não encontrado.");
  }
  const entry = await tx.financeEntry.create({
    data: {
      ...input,
      athleteId: input.athleteId ?? null,
      competitionId: input.competitionId ?? null,
      technicalStaffId: input.technicalStaffId ?? null,
      payrollService: input.payrollService ?? null,
      createdById: userId,
    },
  });
  await audit(
    {
      userId,
      action: "finance.entry.create",
      entity: "FinanceEntry",
      entityId: entry.id,
      summary: `Lançou ${input.type === "INCOME" ? "receita" : "despesa"} de ${formatMoney(input.amountCents)}: ${input.description}`,
      after: { type: input.type, category: input.category, amountCents: input.amountCents, occurredOn: input.occurredOn.toISOString() },
    },
    tx,
  );
  return entry;
}

/**
 * Estorna um lançamento: ele continua no histórico, mas deixa de contar no caixa.
 * Se era o pagamento de uma mensalidade, ela volta a ficar em aberto.
 */
export async function voidEntry(entryId: string, reason: string, userId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const changed = await tx.financeEntry.updateMany({ where: { id: entryId, voidedAt: null }, data: { voidedAt: new Date(), voidReason: reason } });
    if (changed.count === 0) {
      const exists = await tx.financeEntry.findUnique({ where: { id: entryId }, select: { id: true } });
      throw new BusinessError(exists ? "Este lançamento já foi estornado." : "Lançamento não encontrado.");
    }
    await tx.membershipDue.updateMany({ where: { entryId }, data: { entryId: null } });
    const entry = await tx.financeEntry.findUniqueOrThrow({ where: { id: entryId } });
    await audit(
      {
        userId,
        action: "finance.entry.void",
        entity: "FinanceEntry",
        entityId: entryId,
        summary: `Estornou o lançamento de ${formatMoney(entry.amountCents)} (${entry.description}): ${reason}`,
        before: { amountCents: entry.amountCents, type: entry.type, category: entry.category },
      },
      tx,
    );
  });
}

/** Gera as mensalidades do mês para os diretores ativos que ainda não têm. Devolve quantas criou. */
export async function generateDues(month: string, userId: string): Promise<number> {
  const settings = await getDueSettings();
  if (settings.amountCents === null) throw new BusinessError("Defina o valor da mensalidade antes de gerar as cobranças.");
  const amountCents = settings.amountCents;
  const dueDate = dueDateFor(month, settings.dueDay);

  return prisma.$transaction(async (tx) => {
    // Só diretores ativos são cobrados (veja paysDues em rules.ts).
    const [directors, existing] = await Promise.all([
      tx.director.findMany({ where: { status: "ACTIVE" }, select: { id: true } }),
      tx.membershipDue.findMany({ where: { referenceMonth: month }, select: { directorId: true } }),
    ]);
    const missing = membersWithoutDue(
      directors.map((director) => director.id),
      existing.map((due) => due.directorId),
    );
    if (missing.length === 0) return 0;
    // skipDuplicates protege contra dois cliques simultâneos: a chave única (diretor, mês) evita duplicar.
    const created = await tx.membershipDue.createMany({
      data: missing.map((directorId) => ({ directorId, referenceMonth: month, amountCents, dueDate })),
      skipDuplicates: true,
    });
    await audit(
      { userId, action: "finance.dues.generate", entity: "MembershipDue", entityId: month, summary: `Gerou ${created.count} mensalidade(s) de ${monthLabel(month)}`, after: { month, amountCents, count: created.count } },
      tx,
    );
    return created.count;
  });
}

/** Registra o pagamento de uma mensalidade: cria a receita e liga à mensalidade, tudo ou nada. */
export async function payDue(dueId: string, method: PaymentMethod, paidOn: Date, userId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const due = await tx.membershipDue.findUnique({ where: { id: dueId }, include: { director: true } });
    if (!due) throw new BusinessError("Mensalidade não encontrada.");
    if (due.waivedAt) throw new BusinessError("Esta mensalidade está isenta. Desfaça a isenção antes de registrar o pagamento.");
    if (due.entryId) throw new BusinessError("Esta mensalidade já está paga.");

    const entry = await createEntry(
      {
        type: "INCOME",
        category: "MEMBERSHIP",
        description: `Mensalidade de ${monthLabel(due.referenceMonth)} — ${due.director.name}`,
        amountCents: due.amountCents,
        occurredOn: paidOn,
        method,
        notes: null,
        matchId: null,
        agreementId: null,
      },
      userId,
      tx,
    );
    // A condição entryId: null impede pagamento em dobro se duas pessoas registrarem ao mesmo tempo.
    const linked = await tx.membershipDue.updateMany({ where: { id: dueId, entryId: null, waivedAt: null }, data: { entryId: entry.id } });
    if (linked.count !== 1) throw new BusinessError("Esta mensalidade acabou de ser alterada por outra pessoa. Recarregue a página.");
  });
}

export async function setDueWaived(dueId: string, reason: string | null, userId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const due = await tx.membershipDue.findUnique({ where: { id: dueId }, include: { director: true } });
    if (!due) throw new BusinessError("Mensalidade não encontrada.");
    if (due.entryId) throw new BusinessError("Esta mensalidade já está paga. Estorne o pagamento antes de isentar.");
    await tx.membershipDue.update({ where: { id: dueId }, data: reason === null ? { waivedAt: null, waivedReason: null } : { waivedAt: new Date(), waivedReason: reason } });
    await audit(
      {
        userId,
        action: reason === null ? "finance.dues.unwaive" : "finance.dues.waive",
        entity: "MembershipDue",
        entityId: dueId,
        summary: `${reason === null ? "Desfez a isenção" : "Isentou"} a mensalidade de ${monthLabel(due.referenceMonth)} de ${due.director.name}${reason ? `: ${reason}` : ""}`,
      },
      tx,
    );
  });
}

export const entryInclude = {
  match: { include: { homeTeam: true, awayTeam: true } },
  agreement: true,
  athlete: { select: { id: true, name: true, nickname: true } },
  technicalStaff: { select: { id: true, name: true, nickname: true } },
  competition: { select: { id: true, name: true } },
  createdBy: { select: { name: true } },
  due: { select: { id: true } },
} satisfies Prisma.FinanceEntryInclude;

export type EntryWithLinks = Prisma.FinanceEntryGetPayload<{ include: typeof entryInclude }>;

export type EntryFilters = {
  month: string;
  type?: EntryType;
  category?: Category;
  matchId?: string;
  agreementId?: string;
  /** Só os lançamentos feitos pela folha: jogadores, comissão técnica e outras despesas com tipo de serviço. */
  payroll?: boolean;
};

export async function listEntries(filters: EntryFilters): Promise<EntryWithLinks[]> {
  const { start, end } = monthRange(filters.month);
  // Ao filtrar por partida ou acordo, mostra o histórico inteiro, não só o mês.
  const scoped = Boolean(filters.matchId || filters.agreementId);
  return prisma.financeEntry.findMany({
    where: {
      ...(scoped ? {} : { occurredOn: { gte: start, lt: end } }),
      ...(filters.type ? { type: filters.type } : {}),
      ...(filters.category ? { category: filters.category } : {}),
      ...(filters.matchId ? { matchId: filters.matchId } : {}),
      ...(filters.agreementId ? { agreementId: filters.agreementId } : {}),
      ...(filters.payroll ? { OR: [{ category: { in: ["PLAYER_PAYMENT", "STAFF_PAYMENT"] } }, { payrollService: { not: null } }] } : {}),
    },
    include: entryInclude,
    orderBy: [{ occurredOn: "desc" }, { createdAt: "desc" }],
    take: 500,
  });
}

/** Saldo de todo o período (lançamentos válidos), calculado no banco. */
export async function overallBalance(): Promise<{ incomeCents: number; expenseCents: number; balanceCents: number }> {
  const groups = await prisma.financeEntry.groupBy({ by: ["type"], where: { voidedAt: null }, _sum: { amountCents: true } });
  const total = (type: string) => groups.find((group) => group.type === type)?._sum.amountCents ?? 0;
  const incomeCents = total("INCOME");
  const expenseCents = total("EXPENSE");
  return { incomeCents, expenseCents, balanceCents: incomeCents - expenseCents };
}

export async function monthSummary(month: string) {
  const { start, end } = monthRange(month);
  const entries = await prisma.financeEntry.findMany({
    where: { occurredOn: { gte: start, lt: end } },
    select: { type: true, category: true, amountCents: true, voidedAt: true },
  });
  return summarize(entries);
}

export const dueInclude = { director: true, entry: true } satisfies Prisma.MembershipDueInclude;
export type DueWithLinks = Prisma.MembershipDueGetPayload<{ include: typeof dueInclude }>;

export async function listDues(month: string): Promise<DueWithLinks[]> {
  return prisma.membershipDue.findMany({ where: { referenceMonth: month }, include: dueInclude, orderBy: { director: { name: "asc" } } });
}
