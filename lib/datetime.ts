export const TIME_ZONE = "America/Sao_Paulo";

const dateFmt = new Intl.DateTimeFormat("pt-BR", { timeZone: TIME_ZONE, day: "2-digit", month: "2-digit", year: "numeric" });
const timeFmt = new Intl.DateTimeFormat("pt-BR", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit", hour12: false });
const weekdayFmt = new Intl.DateTimeFormat("pt-BR", { timeZone: TIME_ZONE, weekday: "long" });
const partsFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** DD/MM/AAAA no fuso de São Paulo. */
export function formatDate(date: Date): string {
  return dateFmt.format(date);
}

/** HH:mm (24h) no fuso de São Paulo. */
export function formatTime(date: Date): string {
  return timeFmt.format(date);
}

export function formatDateTime(date: Date): string {
  return `${formatDate(date)} às ${formatTime(date)}`;
}

export function formatWeekday(date: Date): string {
  return weekdayFmt.format(date);
}

function zonedParts(date: Date) {
  const map: Record<string, number> = {};
  for (const part of partsFmt.formatToParts(date)) {
    if (part.type !== "literal") map[part.type] = Number(part.value);
  }
  return { year: map.year ?? 0, month: map.month ?? 1, day: map.day ?? 1, hour: map.hour ?? 0, minute: map.minute ?? 0 };
}

function zoneOffsetMs(date: Date): number {
  const p = zonedParts(date);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
  return asUtc - Math.floor(date.getTime() / 60_000) * 60_000;
}

/**
 * Interpreta "AAAA-MM-DDTHH:mm" (valor de <input type="datetime-local">) como horário de São Paulo
 * e devolve o instante em UTC. Retorna null se o texto for inválido.
 */
export function saoPauloLocalToUtc(local: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local.trim());
  if (!m) return null;
  const [year, month, day, hour, minute] = m.slice(1).map(Number) as [number, number, number, number, number];
  const asUtc = Date.UTC(year, month - 1, day, hour, minute);
  const check = new Date(asUtc);
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day ||
    hour > 23 ||
    minute > 59
  ) {
    return null;
  }
  let result = asUtc - zoneOffsetMs(new Date(asUtc));
  const corrected = asUtc - zoneOffsetMs(new Date(result));
  if (corrected !== result) result = corrected;
  return new Date(result);
}

/** Converte um instante para o formato de <input type="datetime-local"> em horário de São Paulo. */
export function utcToSaoPauloLocal(date: Date): string {
  const p = zonedParts(date);
  const pad = (n: number, size = 2) => String(n).padStart(size, "0");
  return `${pad(p.year, 4)}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}
