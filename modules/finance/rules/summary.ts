// Resumo do caixa.
import { CATEGORIES, type Category, categoryType, type EntryType } from "./catalog";

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
