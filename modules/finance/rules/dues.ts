// Mensalidades dos diretores.

export type DueStatus = "PAID" | "WAIVED" | "OVERDUE" | "OPEN";
export const DUE_STATUS_LABELS: Record<DueStatus, string> = { PAID: "Paga", WAIVED: "Isenta", OVERDUE: "Atrasada", OPEN: "Em aberto" };

type DueLike = { dueDate: Date; waivedAt: Date | null; entry: { voidedAt: Date | null } | null };

/** Paga = tem lançamento válido (não estornado). Isenta tem precedência sobre atraso. */
export function dueStatus(due: DueLike, now: Date = new Date()): DueStatus {
  if (due.entry && due.entry.voidedAt === null) return "PAID";
  if (due.waivedAt) return "WAIVED";
  return due.dueDate.getTime() < now.getTime() ? "OVERDUE" : "OPEN";
}

/** Resumo das mensalidades de um mês: quanto entrou, quanto falta e quantas há em cada situação. */
export type DuesSummary = { paidCents: number; pendingCents: number; counts: Record<DueStatus, number>; total: number };

export function summarizeDues(dues: readonly (DueLike & { amountCents: number })[], now: Date = new Date()): DuesSummary {
  const summary: DuesSummary = { paidCents: 0, pendingCents: 0, counts: { PAID: 0, WAIVED: 0, OVERDUE: 0, OPEN: 0 }, total: dues.length };
  for (const due of dues) {
    const status = dueStatus(due, now);
    summary.counts[status] += 1;
    if (status === "PAID") summary.paidCents += due.amountCents;
    if (status === "OPEN" || status === "OVERDUE") summary.pendingCents += due.amountCents;
  }
  return summary;
}

/** Situações possíveis ao incluir uma mensalidade: já recebida ou ainda a receber. */
export const DUE_ENTRY_MODES = ["PAID", "OPEN"] as const;
export type DueEntryMode = (typeof DUE_ENTRY_MODES)[number];
export const DUE_ENTRY_MODE_LABELS: Record<DueEntryMode, string> = { PAID: "Paga", OPEN: "Em aberto (a receber)" };

/** Diretores que ainda não têm mensalidade no mês (gerar duas vezes não duplica). */
export function membersWithoutDue(activeIds: readonly string[], existingIds: readonly string[]): string[] {
  const existing = new Set(existingIds);
  return [...new Set(activeIds)].filter((id) => !existing.has(id));
}
