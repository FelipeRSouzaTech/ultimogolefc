import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { BusinessError } from "@/lib/action";
import { dueStatus, entryDate } from "@/modules/finance/rules";
import { createEntry, generateDues, getDueSettings, listDues, overallBalance, payDue, saveDueSettings, setDueWaived, voidEntry } from "@/modules/finance/service";

// Mês bem antigo, exclusivo deste teste, para não misturar com dados reais do banco de testes.
const MONTH = "2001-01";
const run = randomUUID().slice(0, 8);
const ids = { user: "", athletes: [] as string[] };
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
  for (const name of ["Um", "Dois"]) {
    const athlete = await prisma.athlete.create({ data: { name: `Jogador ${name} ${run}`, position: "MIDFIELDER" } });
    ids.athletes.push(athlete.id);
  }
  await prisma.athlete.create({ data: { name: `Jogador Inativo ${run}`, position: "DEFENDER", status: "INACTIVE" } }).then((athlete) => ids.athletes.push(athlete.id));
  await saveDueSettings(5000, 10, ids.user);
});

afterAll(async () => {
  await prisma.membershipDue.deleteMany({ where: { referenceMonth: MONTH } });
  await prisma.financeEntry.deleteMany({ where: { createdById: ids.user } });
  await prisma.auditLog.deleteMany({ where: { userId: ids.user } });
  await prisma.athlete.deleteMany({ where: { id: { in: ids.athletes } } });
  if (previous.amountCents === null) await prisma.siteSetting.deleteMany({ where: { key: { startsWith: "finance." } } });
  else await saveDueSettings(previous.amountCents, previous.dueDay, ids.user).then(() => prisma.auditLog.deleteMany({ where: { userId: ids.user } }));
  await prisma.user.deleteMany({ where: { id: ids.user } });
  await prisma.$disconnect();
});

describe("mensalidades no banco", () => {
  it("gera uma mensalidade por jogador ativo e não duplica ao repetir", async () => {
    await generateDues(MONTH, ids.user);
    const mine = (await listDues(MONTH)).filter((due) => ids.athletes.includes(due.athleteId));
    expect(mine).toHaveLength(2);
    expect(mine.every((due) => due.amountCents === 5000 && dueStatus(due) === "OVERDUE")).toBe(true);

    expect(await generateDues(MONTH, ids.user)).toBe(0);
    expect((await listDues(MONTH)).filter((due) => ids.athletes.includes(due.athleteId))).toHaveLength(2);
  });

  it("pagar cria a receita, liga à mensalidade e aumenta o saldo", async () => {
    const before = await overallBalance();
    const due = (await listDues(MONTH)).find((item) => item.athleteId === ids.athletes[0]);
    expect(due).toBeTruthy();
    if (!due) return;

    await payDue(due.id, "PIX", paidOn, ids.user);

    const paid = (await listDues(MONTH)).find((item) => item.id === due.id);
    expect(paid && dueStatus(paid)).toBe("PAID");
    expect(paid?.entry).toMatchObject({ type: "INCOME", category: "MEMBERSHIP", amountCents: 5000, method: "PIX" });
    expect((await overallBalance()).balanceCents).toBe(before.balanceCents + 5000);
  });

  it("recusa pagar duas vezes e não cria receita em dobro", async () => {
    const due = (await listDues(MONTH)).find((item) => item.athleteId === ids.athletes[0]);
    if (!due) throw new Error("mensalidade não encontrada");
    const entriesBefore = await prisma.financeEntry.count({ where: { createdById: ids.user } });
    expect((await rejects(() => payDue(due.id, "CASH", paidOn, ids.user))) instanceof BusinessError).toBe(true);
    expect(await prisma.financeEntry.count({ where: { createdById: ids.user } })).toBe(entriesBefore);
  });

  it("estornar o pagamento reabre a mensalidade, mantém o lançamento e devolve o saldo", async () => {
    const due = (await listDues(MONTH)).find((item) => item.athleteId === ids.athletes[0]);
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
    const due = (await listDues(MONTH)).find((item) => item.athleteId === ids.athletes[1]);
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
