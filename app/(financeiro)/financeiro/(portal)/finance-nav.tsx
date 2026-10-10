import Link from "next/link";
import { monthLabel, shiftMonth } from "@/modules/finance/rules";

/** Navegação entre meses: anterior, atual e próximo. */
export function MonthNav({ basePath, month, extraQuery = "" }: { basePath: string; month: string; extraQuery?: string }) {
  const href = (key: string) => `${basePath}?mes=${key}${extraQuery}`;
  return (
    <div className="mb-6 flex flex-wrap items-center gap-3">
      <Link href={href(shiftMonth(month, -1))} className="btn btn-secondary btn-sm" aria-label={`Mês anterior: ${monthLabel(shiftMonth(month, -1))}`}>
        ← Anterior
      </Link>
      <p className="min-w-44 text-center font-display text-lg font-extrabold capitalize" aria-live="polite">
        {monthLabel(month)}
      </p>
      <Link href={href(shiftMonth(month, 1))} className="btn btn-secondary btn-sm" aria-label={`Próximo mês: ${monthLabel(shiftMonth(month, 1))}`}>
        Próximo →
      </Link>
    </div>
  );
}
