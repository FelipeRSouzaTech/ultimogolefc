import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { BusinessError } from "@/lib/action";
import { dueStatus, entryDate } from "@/modules/finance/rules";
import { createEntry, type EntryInput, generateDues, getDueSettings, listDues, listEntries, overallBalance, payDue, saveDueSettings, setDueWaived, voidEntry } from "@/modules/finance/service";

// Mês bem antigo, exclusivo deste teste, para não misturar com dados reais do banco de testes.
const MONTH = "2001-01";
const run = randomUUID().slice(0, 8);
const ids = { user: "", directors: [] as string[], athlete: "", staff: "", competitions: [] as string[], clubs: [] as string[], season: "", match: "" };
let previous: { amountCents: number | null; dueDay: number };
const paidOn = entryDate("2001-01-15") ?? new Date();

async function rejects(action: () => Promise<unknown>): Promise<unknown> {
  try {
    await action();
  } catch (error) {
    return error;
  }
  return null;
}

beforeAll(async () => {
  previous = await getDueSettings();
  const user = await prisma.user.create({ data: { name: "Tesoureiro de teste", email: `tesouraria-${run}@exemplo.com`, passwordHash: "x", role: "TREASURER" } });
  ids.user = user.id;
  for (const [name, status] of [
    ["Um", "ACTIVE"],
    ["Dois", "ACTIVE"],
    ["Licenciado", "ON_LEAVE"],
    ["Desligado", "DISMISSED"],
  ] as const) {
    const director = await prisma.director.create({ data: { name: `Diretor ${name} ${run}`, role: "Diretor", status } });
    ids.directors.push(director.id);
  }
  const athlete = await prisma.athlete.create({ data: { name: `Jogador ${run}`, nickname: `Craque ${run}`, position: "FORWARD" } });
  ids.athlete = athlete.id;
  const member = await prisma.technicalStaff.create({ data: { name: `Treinador ${run}`, role: "HEAD_COACH" } });
  ids.staff = member.id;
  for (const letter of ["A", "B"]) {
    const club = await prisma.club.create({ data: { name: `Clube Fin ${letter} ${run}`, slug: `clube-fin-${letter.toLowerCase()}-${run}` } });
    ids.clubs.push(club.id);
    const competition = await prisma.competition.create({ data: { name: `Copa Fin ${letter} ${run}`, slug: `copa-fin-${letter.toLowerCase()}-${run}` } });
    ids.competitions.push(competition.id);
  }
  const season = await prisma.season.create({ data: { competitionId: ids.competitions[0] ?? "", label: "2001", teams: { create: ids.clubs.map((clubId) => ({ clubId })) } } });
  ids.season = season.id;
  const match = await prisma.match.create({ data: { seasonId: season.id, homeTeamId: ids.clubs[0] ?? "", awayTeamId: ids.clubs[1] ?? "", kickoffAt: paidOn } });
  ids.match = match.id;
  await saveDueSettings(5000, 10, ids.user);
});

afterAll(async () => {
  await prisma.membershipDue.deleteMany({ where: { referenceMonth: MONTH } });
  await prisma.financeEntry.deleteMany({ where: { createdById: ids.user } });
  await prisma.auditLog.deleteMany({ where: { userId: ids.user } });
  await prisma.director.deleteMany({ where: { id: { in: ids.directors } } });
  await prisma.athlete.deleteMany({ where: { id: ids.athlete } });
  await prisma.technicalStaff.deleteMany({ where: { id: ids.staff } });
  await prisma.match.deleteMany({ where: { id: ids.match } });
  await prisma.season.deleteMany({ where: { id: ids.season } });
  await prisma.competition.deleteMany({ where: { id: { in: ids.competitions } } });
  await prisma.club.deleteMany({ where: { id: { in: ids.clubs } } });
  if (previous.amountCents === null) await prisma.siteSetting.deleteMany({ where: { key: { startsWith: "finance." } } });
  else await saveDueSettings(previous.amountCents, previous.dueDay, ids.user).then(() => prisma.auditLog.deleteMany({ where: { userId: ids.user } }));
  await prisma.user.deleteMany({ where: { id: ids.user } });
  await prisma.$disconnect();
});

describe("mensalidades dos diretores no banco", () => {
  it("gera uma mensalidade por diretor ativo (não para licenciado ou desligado) e não duplica ao repetir", async () => {
    await generateDues(MONTH, ids.user);
    const mine = (await listDues(MONTH)).filter((due) => ids.directors.includes(due.directorId));
    expect(mine).toHaveLength(2);
    expect(mine.every((due) => due.amountCents === 5000 && dueStatus(due) === "OVERDUE")).toBe(true);

    expect(await generateDues(MONTH, ids.user)).toBe(0);
    expect((await listDues(MONTH)).filter((due) => ids.directors.includes(due.directorId))).toHaveLength(2);
  });

  it("pagar cria a receita, liga à mensalidade e aumenta o saldo", async () => {
    const before = await overallBalance();
    const due = (await listDues(MONTH)).find((item) => item.directorId === ids.directors[0]);
    expect(due).toBeTruthy();
    if (!due) return;

    await payDue(due.id, "PIX", paidOn, ids.user);

    const paid = (await listDues(MONTH)).find((item) => item.id === due.id);
    expect(paid && dueStatus(paid)).toBe("PAID");
    expect(paid?.entry).toMatchObject({ type: "INCOME", category: "MEMBERSHIP", amountCents: 5000, method: "PIX" });
    expect((await overallBalance()).balanceCents).toBe(before.balanceCents + 5000);
  });

  it("recusa pagar duas vezes e não cria receita em dobro", async () => {
    const due = (await listDues(MONTH)).find((item) => item.directorId === ids.directors[0]);
    if (!due) throw new Error("mensalidade não encontrada");
    const entriesBefore = await prisma.financeEntry.count({ where: { createdById: ids.user } });
    expect((await rejects(() => payDue(due.id, "CASH", paidOn, ids.user))) instanceof BusinessError).toBe(true);
    expect(await prisma.financeEntry.count({ where: { createdById: ids.user } })).toBe(entriesBefore);
  });

  it("estornar o pagamento reabre a mensalidade, mantém o lançamento e devolve o saldo", async () => {
    const due = (await listDues(MONTH)).find((item) => item.directorId === ids.directors[0]);
    if (!due?.entryId) throw new Error("mensalidade sem pagamento");
    const before = await overallBalance();

    await voidEntry(due.entryId, "Pagamento registrado no jogador errado", ids.user);

    const reopened = (await listDues(MONTH)).find((item) => item.id === due.id);
    expect(reopened?.entryId).toBeNull();
    expect(reopened && dueStatus(reopened)).toBe("OVERDUE");
    const entry = await prisma.financeEntry.findUnique({ where: { id: due.entryId } });
    expect(entry?.voidedAt).toBeTruthy();
    expect((await overallBalance()).balanceCents).toBe(before.balanceCents - 5000);

    expect((await rejects(() => voidEntry(due.entryId ?? "", "Segunda tentativa", ids.user))) instanceof BusinessError).toBe(true);
  });

  it("isenção impede o pagamento até ser desfeita", async () => {
    const due = (await listDues(MONTH)).find((item) => item.directorId === ids.directors[1]);
    if (!due) throw new Error("mensalidade não encontrada");
    await setDueWaived(due.id, "Lesionado", ids.user);
    const waived = (await listDues(MONTH)).find((item) => item.id === due.id);
    expect(waived && dueStatus(waived)).toBe("WAIVED");
    expect((await rejects(() => payDue(due.id, "PIX", paidOn, ids.user))) instanceof BusinessError).toBe(true);

    await setDueWaived(due.id, null, ids.user);
    await payDue(due.id, "CASH", paidOn, ids.user);
    const paid = (await listDues(MONTH)).find((item) => item.id === due.id);
    expect(paid && dueStatus(paid)).toBe("PAID");
  });
});

describe("folha de pagamento no banco", () => {
  const payment = (overrides: Partial<EntryInput> = {}): EntryInput => ({
    type: "EXPENSE",
    category: "PLAYER_PAYMENT",
    description: `Pagamento ${run}`,
    amountCents: 20000,
    occurredOn: paidOn,
    method: "PIX",
    notes: null,
    agreementId: null,
    matchId: ids.match,
    athleteId: ids.athlete,
    competitionId: ids.competitions[0] ?? null,
    ...overrides,
  });

  it("registra o pagamento ao jogador como despesa, ligado à competição e à partida", async () => {
    const before = await overallBalance();
    const entry = await prisma.$transaction((tx) => createEntry(payment(), ids.user, tx));
    const stored = await prisma.financeEntry.findUnique({ where: { id: entry.id }, include: { athlete: true, competition: true, match: true } });
    expect(stored).toMatchObject({ type: "EXPENSE", category: "PLAYER_PAYMENT", amountCents: 20000 });
    expect(stored?.athlete?.nickname).toBe(`Craque ${run}`);
    expect(stored?.competition?.id).toBe(ids.competitions[0]);
    expect(stored?.match?.id).toBe(ids.match);
    expect((await overallBalance()).balanceCents).toBe(before.balanceCents - 20000);
  });

  it("recusa partida que não pertence à competição escolhida", async () => {
    const count = await prisma.financeEntry.count({ where: { createdById: ids.user } });
    const error = await rejects(() => prisma.$transaction((tx) => createEntry(payment({ competitionId: ids.competitions[1] ?? null }), ids.user, tx)));
    expect(error instanceof BusinessError).toBe(true);
    expect(await prisma.financeEntry.count({ where: { createdById: ids.user } })).toBe(count);
  });

  it("registra pagamento à comissão técnica e outra despesa com tipo de serviço, e a folha lista só o que é dela", async () => {
    const staffPayment = await prisma.$transaction((tx) =>
      createEntry(payment({ category: "STAFF_PAYMENT", athleteId: null, technicalStaffId: ids.staff, amountCents: 30000 }), ids.user, tx),
    );
    const service = await prisma.$transaction((tx) =>
      createEntry(payment({ category: "OTHER_EXPENSE", athleteId: null, payrollService: "Fotógrafo", amountCents: 15000 }), ids.user, tx),
    );
    // Despesa comum lançada em Lançamentos: mesma categoria, mas sem tipo de serviço — não é da folha.
    const common = await prisma.$transaction((tx) =>
      createEntry(payment({ category: "OTHER_EXPENSE", athleteId: null, matchId: null, competitionId: null, amountCents: 999 }), ids.user, tx),
    );

    const stored = await prisma.financeEntry.findUnique({ where: { id: staffPayment.id }, include: { technicalStaff: true } });
    expect(stored).toMatchObject({ type: "EXPENSE", category: "STAFF_PAYMENT", athleteId: null });
    expect(stored?.technicalStaff?.name).toBe(`Treinador ${run}`);

    const listed = (await listEntries({ month: MONTH, payroll: true })).map((entry) => entry.id);
    expect(listed.includes(staffPayment.id)).toBe(true);
    expect(listed.includes(service.id)).toBe(true);
    expect(listed.includes(common.id)).toBe(false);
  });

  it("recusa membro da comissão inexistente", async () => {
    const error = await rejects(() => prisma.$transaction((tx) => createEntry(payment({ category: "STAFF_PAYMENT", athleteId: null, technicalStaffId: "membro-inexistente" }), ids.user, tx)));
    expect(error instanceof BusinessError).toBe(true);
  });

  it("recusa jogador inexistente", async () => {
    const error = await rejects(() => prisma.$transaction((tx) => createEntry(payment({ athleteId: "jogador-inexistente" }), ids.user, tx)));
    expect(error instanceof BusinessError).toBe(true);
  });
});

describe("caixa no banco", () => {
  it("despesa reduz o saldo e fica registrada na auditoria", async () => {
    const before = await overallBalance();
    const entry = await prisma.$transaction((tx) =>
      createEntry(
        { type: "EXPENSE", category: "REFEREE", description: `Arbitragem ${run}`, amountCents: 12000, occurredOn: paidOn, method: "CASH", notes: null, matchId: null, agreementId: null },
        ids.user,
        tx,
      ),
    );
    const after = await overallBalance();
    expect(after.expenseCents).toBe(before.expenseCents + 12000);
    expect(after.balanceCents).toBe(before.balanceCents - 12000);
    expect(await prisma.auditLog.count({ where: { entity: "FinanceEntry", entityId: entry.id, action: "finance.entry.create" } })).toBe(1);
  });

  it("recusa lançamento ligado a partida inexistente e não grava nada", async () => {
    const count = await prisma.financeEntry.count({ where: { createdById: ids.user } });
    const error = await rejects(() =>
      prisma.$transaction((tx) =>
        createEntry(
          { type: "EXPENSE", category: "FIELD", description: `Campo ${run}`, amountCents: 1000, occurredOn: paidOn, method: "PIX", notes: null, matchId: "partida-inexistente", agreementId: null },
          ids.user,
          tx,
        ),
      ),
    );
    expect(error instanceof BusinessError).toBe(true);
    expect(await prisma.financeEntry.count({ where: { createdById: ids.user } })).toBe(count);
  });
});
