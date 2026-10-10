// Regras do financeiro. Módulo puro: valores sempre em centavos (inteiros), nunca em ponto flutuante.
import { saoPauloLocalToUtc, utcToSaoPauloLocal } from "@/lib/datetime";

export const ENTRY_TYPES = ["INCOME", "EXPENSE"] as const;
export type EntryType = (typeof ENTRY_TYPES)[number];
export const ENTRY_TYPE_LABELS: Record<EntryType, string> = { INCOME: "Receita", EXPENSE: "Despesa" };

export const INCOME_CATEGORIES = ["MEMBERSHIP", "SPONSORSHIP", "DONATION", "EVENT", "OTHER_INCOME"] as const;
export const EXPENSE_CATEGORIES = ["PLAYER_PAYMENT", "REFEREE", "FIELD", "UNIFORM", "EQUIPMENT", "TRANSPORT", "REGISTRATION", "OTHER_EXPENSE"] as const;
export const CATEGORIES = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  MEMBERSHIP: "Mensalidade",
  SPONSORSHIP: "Patrocínio",
  DONATION: "Doação",
  EVENT: "Evento",
  OTHER_INCOME: "Outras receitas",
  REFEREE: "Arbitragem",
  FIELD: "Campo",
  UNIFORM: "Uniforme",
  EQUIPMENT: "Material esportivo",
  TRANSPORT: "Transporte",
  REGISTRATION: "Inscrição em competição",
  PLAYER_PAYMENT: "Jogadores",
  OTHER_EXPENSE: "Outras despesas",
};

export function categoryType(category: Category): EntryType {
  return (INCOME_CATEGORIES as readonly string[]).includes(category) ? "INCOME" : "EXPENSE";
}

export const PAYMENT_METHODS = ["PIX", "CASH", "TRANSFER", "CARD", "OTHER"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  PIX: "Pix",
  CASH: "Dinheiro",
  TRANSFER: "Transferência",
  CARD: "Cartão",
  OTHER: "Outro",
};

export const AGREEMENT_KINDS = ["SPONSORSHIP", "DONATION"] as const;
export type AgreementKind = (typeof AGREEMENT_KINDS)[number];
export const AGREEMENT_KIND_LABELS: Record<AgreementKind, string> = { SPONSORSHIP: "Patrocínio", DONATION: "Doação" };

// ---------- Dinheiro ----------

export const MAX_AMOUNT_CENTS = 1_000_000_000; // R$ 10 milhões por lançamento

/**
 * Converte um valor digitado em reais para centavos. Aceita "50", "50,00", "1.234,56", "1234.56" e "R$ 50,00".
 * Devolve null para texto inválido, valor zero, negativo, com mais de duas casas ou acima do limite.
 */
export function parseMoney(raw: string): number | null {
  let text = raw.replace(/R\$/i, "").replace(/\s/g, "");
  if (text === "") return null;
  if (text.includes(",")) {
    text = text.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(text)) {
    text = text.replace(/\./g, "");
  }
  const match = /^(\d{1,9})(?:\.(\d{1,2}))?$/.exec(text);
  if (!match) return null;
  const cents = Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
  if (!Number.isSafeInteger(cents) || cents <= 0 || cents > MAX_AMOUNT_CENTS) return null;
  return cents;
}

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** Formata centavos como moeda brasileira, com espaços comuns (sem espaço inseparável). */
export function formatMoney(cents: number): string {
  return brl.format(cents / 100).replace(/ | /g, " ");
}

/** Centavos no formato de um campo de formulário: 123456 → "1234,56". */
export function centsToInput(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const absolute = Math.abs(cents);
  return `${sign}${Math.floor(absolute / 100)},${String(absolute % 100).padStart(2, "0")}`;
}

// ---------- Meses ----------

const MONTH_KEY = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Mês de referência no formato "AAAA-MM". */
export function isMonthKey(value: unknown): value is string {
  return typeof value === "string" && MONTH_KEY.test(value);
}

/** Mês atual no horário de Brasília. */
export function currentMonthKey(now: Date = new Date()): string {
  return utcToSaoPauloLocal(now).slice(0, 7);
}

export function shiftMonth(key: string, delta: number): string {
  const [year, month] = key.split("-").map(Number) as [number, number];
  const index = year * 12 + (month - 1) + delta;
  return `${String(Math.floor(index / 12)).padStart(4, "0")}-${String((index % 12) + 1).padStart(2, "0")}`;
}

/** Intervalo [início, fim) do mês, no horário de Brasília. */
export function monthRange(key: string): { start: Date; end: Date } {
  const start = saoPauloLocalToUtc(`${key}-01T00:00`);
  const end = saoPauloLocalToUtc(`${shiftMonth(key, 1)}-01T00:00`);
  if (!start || !end) throw new Error(`Mês inválido: ${key}`);
  return { start, end };
}

const MONTH_NAMES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

export function monthLabel(key: string): string {
  const [year, month] = key.split("-").map(Number) as [number, number];
  return `${MONTH_NAMES[month - 1] ?? ""} de ${year}`;
}

function daysInMonth(key: string): number {
  const [year, month] = key.split("-").map(Number) as [number, number];
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Vencimento no fim do dia escolhido; dias inexistentes no mês (ex.: 31 em fevereiro) viram o último dia. */
export function dueDateFor(key: string, day: number): Date {
  const clamped = Math.min(Math.max(1, Math.floor(day) || 1), daysInMonth(key));
  const date = saoPauloLocalToUtc(`${key}-${String(clamped).padStart(2, "0")}T23:59`);
  if (!date) throw new Error(`Mês inválido: ${key}`);
  return date;
}

/** Data de um lançamento: meio-dia de Brasília, para o dia não mudar em nenhum fuso. */
export function entryDate(day: string): Date | null {
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? saoPauloLocalToUtc(`${day}T12:00`) : null;
}

// ---------- Mensalidades ----------

export type DueStatus = "PAID" | "WAIVED" | "OVERDUE" | "OPEN";
export const DUE_STATUS_LABELS: Record<DueStatus, string> = { PAID: "Paga", WAIVED: "Isenta", OVERDUE: "Atrasada", OPEN: "Em aberto" };

type DueLike = { dueDate: Date; waivedAt: Date | null; entry: { voidedAt: Date | null } | null };

/** Paga = tem lançamento válido (não estornado). Isenta tem precedência sobre atraso. */
export function dueStatus(due: DueLike, now: Date = new Date()): DueStatus {
  if (due.entry && due.entry.voidedAt === null) return "PAID";
  if (due.waivedAt) return "WAIVED";
  return due.dueDate.getTime() < now.getTime() ? "OVERDUE" : "OPEN";
}

/** Diretores que ainda não têm mensalidade no mês (gerar duas vezes não duplica). */
export function membersWithoutDue(activeIds: readonly string[], existingIds: readonly string[]): string[] {
  const existing = new Set(existingIds);
  return [...new Set(activeIds)].filter((id) => !existing.has(id));
}

// ---------- Diretores ----------

export const DIRECTOR_STATUSES = ["ACTIVE", "AWAY", "ON_LEAVE", "INACTIVE", "DISMISSED"] as const;
export type DirectorStatus = (typeof DIRECTOR_STATUSES)[number];
export const DIRECTOR_STATUS_LABELS: Record<DirectorStatus, string> = {
  ACTIVE: "Ativo",
  AWAY: "Afastado",
  ON_LEAVE: "Licenciado",
  INACTIVE: "Inativo",
  DISMISSED: "Desligado",
};

/** Só diretores ativos recebem cobrança de mensalidade; afastados, licenciados, inativos e desligados ficam de fora. */
export function paysDues(status: string): boolean {
  return status === "ACTIVE";
}

// ---------- Folha de pagamento ----------

type PayrollEntry = { athleteId: string | null; amountCents: number; voidedAt: Date | null };

/** Total pago a cada jogador (sem os estornos), do maior para o menor. */
export function totalsByAthlete(entries: readonly PayrollEntry[]): { athleteId: string; totalCents: number; count: number }[] {
  const totals = new Map<string, { totalCents: number; count: number }>();
  for (const entry of entries) {
    if (entry.voidedAt !== null || entry.athleteId === null) continue;
    const current = totals.get(entry.athleteId) ?? { totalCents: 0, count: 0 };
    current.totalCents += entry.amountCents;
    current.count += 1;
    totals.set(entry.athleteId, current);
  }
  return [...totals.entries()].map(([athleteId, value]) => ({ athleteId, ...value })).sort((a, b) => b.totalCents - a.totalCents);
}

// ---------- Resumo do caixa ----------

type EntryLike = { type: string; category: string; amountCents: number; voidedAt: Date | null };

export type Summary = {
  incomeCents: number;
  expenseCents: number;
  balanceCents: number;
  byCategory: { category: Category; type: EntryType; totalCents: number; count: number }[];
};

/** Soma receitas e despesas, ignorando lançamentos estornados. Categorias em ordem de valor. */
export function summarize(entries: readonly EntryLike[]): Summary {
  let incomeCents = 0;
  let expenseCents = 0;
  const groups = new Map<string, { totalCents: number; count: number }>();
  for (const entry of entries) {
    if (entry.voidedAt !== null) continue;
    if (entry.type === "INCOME") incomeCents += entry.amountCents;
    else expenseCents += entry.amountCents;
    const group = groups.get(entry.category) ?? { totalCents: 0, count: 0 };
    group.totalCents += entry.amountCents;
    group.count += 1;
    groups.set(entry.category, group);
  }
  const byCategory = CATEGORIES.filter((category) => groups.has(category))
    .map((category) => ({ category, type: categoryType(category), ...(groups.get(category) ?? { totalCents: 0, count: 0 }) }))
    .sort((a, b) => b.totalCents - a.totalCents);
  return { incomeCents, expenseCents, balanceCents: incomeCents - expenseCents, byCategory };
}

// ---------- Exportação ----------

/**
 * Célula de CSV. Textos iniciados por = + - @ recebem um apóstrofo, para que o Excel
 * não os execute como fórmula (proteção contra "CSV injection").
 */
export function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  let text = String(value);
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** CSV com ponto e vírgula e BOM, o formato que o Excel em português abre corretamente. */
export function toCsv(header: readonly string[], rows: readonly (readonly (string | number | null | undefined)[])[]): string {
  const lines = [header, ...rows].map((row) => row.map(csvCell).join(";"));
  return `﻿${lines.join("\r\n")}\r\n`;
}
