import { formatMoney } from "@/modules/finance/rules";

/**
 * Valor monetário. Receita e despesa são diferenciadas pelo sinal (+ / −) e pelo peso da fonte,
 * não por cor: a paleta do clube não usa verde e vermelho.
 */
export function Money({ cents, sign }: { cents: number; sign?: "INCOME" | "EXPENSE" }) {
  const prefix = sign === "INCOME" ? "+ " : sign === "EXPENSE" ? "− " : "";
  return <span className="whitespace-nowrap tabular-nums">{`${prefix}${formatMoney(cents)}`}</span>;
}

export function StatCard({ label, cents, hint }: { label: string; cents: number; hint?: string }) {
  return (
    <div className="card p-5">
      <p className="text-sm font-semibold text-gray-600">{label}</p>
      <p className={`mt-1 font-display text-2xl font-extrabold tabular-nums ${cents < 0 ? "text-danger" : "text-primary"}`}>{formatMoney(cents)}</p>
      {hint ? <p className="mt-1 text-xs text-gray-600">{hint}</p> : null}
    </div>
  );
}
