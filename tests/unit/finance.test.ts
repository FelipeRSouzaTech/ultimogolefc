import { describe, expect, it } from "vitest";
import { can, homePathFor, ROLES } from "@/lib/auth/permissions";
import {
  athletesWithoutDue,
  categoryType,
  centsToInput,
  csvCell,
  currentMonthKey,
  dueDateFor,
  dueStatus,
  entryDate,
  formatMoney,
  isMonthKey,
  monthLabel,
  monthRange,
  parseMoney,
  shiftMonth,
  summarize,
  toCsv,
} from "@/modules/finance/rules";

describe("valores em dinheiro", () => {
  it("converte os formatos comuns para centavos", () => {
    expect(parseMoney("50")).toBe(5000);
    expect(parseMoney("50,00")).toBe(5000);
    expect(parseMoney("50,5")).toBe(5050);
    expect(parseMoney("1.234,56")).toBe(123456);
    expect(parseMoney("1234.56")).toBe(123456);
    expect(parseMoney("1.234")).toBe(123400);
    expect(parseMoney(" R$ 1.234,56 ")).toBe(123456);
    expect(parseMoney("0,01")).toBe(1);
  });

  it("não perde centavos por arredondamento de ponto flutuante", () => {
    expect(parseMoney("0,29")).toBe(29);
    expect(parseMoney("1,15")).toBe(115);
    expect(parseMoney("19,99")).toBe(1999);
    expect(parseMoney("4,35")).toBe(435);
  });

  it("recusa vazio, zero, negativo, texto, três casas e valores absurdos", () => {
    for (const bad of ["", "0", "0,00", "-5", "abc", "1,234", "1.2.3", "10,0,0", "99999999999", "1e3", "5 reais"]) {
      expect(parseMoney(bad)).toBeNull();
    }
  });

  it("formata centavos como moeda e como valor de formulário", () => {
    expect(formatMoney(123456)).toBe("R$ 1.234,56");
    expect(formatMoney(0)).toBe("R$ 0,00");
    expect(formatMoney(-5000)).toBe("-R$ 50,00");
    expect(centsToInput(123456)).toBe("1234,56");
    expect(centsToInput(5)).toBe("0,05");
    expect(parseMoney(centsToInput(987601))).toBe(987601);
  });
});

describe("meses de referência", () => {
  it("valida o formato AAAA-MM", () => {
    expect(isMonthKey("2026-10")).toBe(true);
    expect(isMonthKey("2026-13")).toBe(false);
    expect(isMonthKey("2026-1")).toBe(false);
    expect(isMonthKey("10/2026")).toBe(false);
    expect(isMonthKey(undefined)).toBe(false);
  });

  it("usa o horário de Brasília para definir o mês atual", () => {
    // 01/11 às 02:00 UTC ainda é 31/10 às 23:00 em Brasília.
    expect(currentMonthKey(new Date("2026-11-01T02:00:00Z"))).toBe("2026-10");
    expect(currentMonthKey(new Date("2026-11-01T03:00:00Z"))).toBe("2026-11");
  });

  it("avança e recua meses, inclusive na virada de ano", () => {
    expect(shiftMonth("2026-10", 1)).toBe("2026-11");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-03", -14)).toBe("2025-01");
  });

  it("calcula o intervalo do mês no fuso de Brasília", () => {
    const { start, end } = monthRange("2026-10");
    expect(start.toISOString()).toBe("2026-10-01T03:00:00.000Z");
    expect(end.toISOString()).toBe("2026-11-01T03:00:00.000Z");
    expect(monthLabel("2026-03")).toBe("março de 2026");
  });

  it("ajusta o vencimento para o último dia quando o dia não existe no mês", () => {
    expect(dueDateFor("2026-10", 10).toISOString()).toBe("2026-10-11T02:59:00.000Z");
    expect(dueDateFor("2026-02", 31).toISOString()).toBe("2026-03-01T02:59:00.000Z");
    expect(dueDateFor("2028-02", 30).toISOString()).toBe("2028-03-01T02:59:00.000Z");
    expect(dueDateFor("2026-10", 0).toISOString()).toBe("2026-10-02T02:59:00.000Z");
  });

  it("interpreta a data do lançamento e recusa formatos inválidos", () => {
    expect(entryDate("2026-10-09")?.toISOString()).toBe("2026-10-09T15:00:00.000Z");
    expect(entryDate("09/10/2026")).toBeNull();
    expect(entryDate("2026-02-31")).toBeNull();
  });
});

describe("mensalidades", () => {
  const now = new Date("2026-10-15T15:00:00Z");
  const past = new Date("2026-10-10T02:59:00Z");
  const future = new Date("2026-10-20T02:59:00Z");

  it("classifica a situação de cada mensalidade", () => {
    expect(dueStatus({ dueDate: future, waivedAt: null, entry: null }, now)).toBe("OPEN");
    expect(dueStatus({ dueDate: past, waivedAt: null, entry: null }, now)).toBe("OVERDUE");
    expect(dueStatus({ dueDate: past, waivedAt: null, entry: { voidedAt: null } }, now)).toBe("PAID");
    expect(dueStatus({ dueDate: past, waivedAt: now, entry: null }, now)).toBe("WAIVED");
  });

  it("pagamento estornado deixa de contar como pago", () => {
    expect(dueStatus({ dueDate: past, waivedAt: null, entry: { voidedAt: now } }, now)).toBe("OVERDUE");
    expect(dueStatus({ dueDate: future, waivedAt: null, entry: { voidedAt: now } }, now)).toBe("OPEN");
  });

  it("gerar mensalidades de novo não duplica as existentes", () => {
    expect(athletesWithoutDue(["a", "b", "c"], ["b"])).toEqual(["a", "c"]);
    expect(athletesWithoutDue(["a", "a", "b"], [])).toEqual(["a", "b"]);
    expect(athletesWithoutDue(["a"], ["a"])).toEqual([]);
  });
});

describe("resumo do caixa", () => {
  const entry = (type: string, category: string, amountCents: number, voided = false) => ({ type, category, amountCents, voidedAt: voided ? new Date() : null });

  it("soma receitas e despesas e calcula o saldo", () => {
    const summary = summarize([entry("INCOME", "MEMBERSHIP", 5000), entry("INCOME", "MEMBERSHIP", 5000), entry("INCOME", "SPONSORSHIP", 30000), entry("EXPENSE", "REFEREE", 12000)]);
    expect(summary.incomeCents).toBe(40000);
    expect(summary.expenseCents).toBe(12000);
    expect(summary.balanceCents).toBe(28000);
    expect(summary.byCategory.map((item) => [item.category, item.totalCents, item.count])).toEqual([
      ["SPONSORSHIP", 30000, 1],
      ["REFEREE", 12000, 1],
      ["MEMBERSHIP", 10000, 2],
    ]);
  });

  it("ignora lançamentos estornados", () => {
    const summary = summarize([entry("INCOME", "DONATION", 10000), entry("INCOME", "DONATION", 99999, true), entry("EXPENSE", "FIELD", 4000, true)]);
    expect(summary).toMatchObject({ incomeCents: 10000, expenseCents: 0, balanceCents: 10000 });
    expect(summary.byCategory).toHaveLength(1);
  });

  it("saldo pode ser negativo e lista vazia zera tudo", () => {
    expect(summarize([entry("EXPENSE", "UNIFORM", 7000)]).balanceCents).toBe(-7000);
    expect(summarize([])).toEqual({ incomeCents: 0, expenseCents: 0, balanceCents: 0, byCategory: [] });
  });

  it("cada categoria pertence a um único tipo", () => {
    expect(categoryType("MEMBERSHIP")).toBe("INCOME");
    expect(categoryType("REFEREE")).toBe("EXPENSE");
    expect(categoryType("OTHER_INCOME")).toBe("INCOME");
    expect(categoryType("OTHER_EXPENSE")).toBe("EXPENSE");
  });
});

describe("exportação CSV", () => {
  it("escapa aspas, separador e quebras de linha", () => {
    expect(csvCell("simples")).toBe("simples");
    expect(csvCell('com "aspas"')).toBe('"com ""aspas"""');
    expect(csvCell("a;b")).toBe('"a;b"');
    expect(csvCell("linha\nnova")).toBe('"linha\nnova"');
    expect(csvCell(null)).toBe("");
    expect(csvCell(1500)).toBe("1500");
  });

  it("neutraliza textos que o Excel executaria como fórmula", () => {
    expect(csvCell("=SOMA(A1:A9)")).toBe("'=SOMA(A1:A9)");
    expect(csvCell("+55 11 99999")).toBe("'+55 11 99999");
    expect(csvCell("-desconto")).toBe("'-desconto");
    expect(csvCell("@comando")).toBe("'@comando");
    // Números de verdade, mesmo negativos, não são alterados.
    expect(csvCell(-50)).toBe("-50");
  });

  it("monta o arquivo com BOM, ponto e vírgula e CRLF", () => {
    expect(toCsv(["Data", "Valor"], [["09/10/2026", "50,00"]])).toBe("﻿Data;Valor\r\n09/10/2026;50,00\r\n");
  });
});

describe("permissões do financeiro", () => {
  it("tesoureiro e superadministrador lançam; administrador só consulta; os demais não veem", () => {
    expect(ROLES.includes("TREASURER")).toBe(true);
    expect(can("TREASURER", "finance:write")).toBe(true);
    expect(can("SUPERADMIN", "finance:write")).toBe(true);
    expect(can("ADMIN", "finance:read")).toBe(true);
    expect(can("ADMIN", "finance:write")).toBe(false);
    for (const role of ["EDITOR", "FOOTBALL_MANAGER", "VIEWER"] as const) {
      expect(can(role, "finance:read")).toBe(false);
      expect(can(role, "finance:write")).toBe(false);
    }
  });

  it("o tesoureiro não entra no painel administrativo", () => {
    expect(can("TREASURER", "dashboard:view")).toBe(false);
    expect(can("TREASURER", "finance:read")).toBe(true);
  });

  it("depois do login cada função vai para um portal a que tem acesso", () => {
    expect(homePathFor("TREASURER", "admin")).toBe("/financeiro");
    expect(homePathFor("TREASURER", "finance")).toBe("/financeiro");
    expect(homePathFor("SUPERADMIN", "admin")).toBe("/admin");
    expect(homePathFor("SUPERADMIN", "finance")).toBe("/financeiro");
    expect(homePathFor("ADMIN", "finance")).toBe("/financeiro");
    // Quem entra pelo financeiro sem ter acesso a ele cai no painel, nunca no financeiro.
    expect(homePathFor("EDITOR", "finance")).toBe("/admin");
    expect(homePathFor("VIEWER", "finance")).toBe("/admin");
  });

  it("toda função tem acesso a pelo menos um dos portais (evita redirecionamento em círculo)", () => {
    for (const role of ROLES) {
      expect(can(role, "dashboard:view") || can(role, "finance:read")).toBe(true);
    }
  });

  it("tesoureiro não altera notícias, futebol, conteúdo nem usuários", () => {
    for (const permission of ["news:write", "football:write", "content:write", "users:manage", "messages:manage"] as const) {
      expect(can("TREASURER", permission)).toBe(false);
    }
  });
});
