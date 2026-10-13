// Meses de referência e datas, no horário de Brasília.
import { saoPauloLocalToUtc, utcToSaoPauloLocal } from "@/lib/datetime";

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
