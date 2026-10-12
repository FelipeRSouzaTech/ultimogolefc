import Link from "next/link";
import { monthLabel, shiftMonth } from "@/modules/finance/rules";

/** Navegação entre meses: anterior, atual e próximo. No celular, cabe em uma linha (só as setas). */
export function MonthNav({ basePath, month, extraQuery = "" }: { basePath: string; month: string; extraQuery?: string }) {
  const href = (key: string) => `${basePath}?mes=${key}${extraQuery}`;
  return (
    <div className="mb-6 flex items-center justify-between gap-2 sm:justify-start sm:gap-3">
      <Link href={href(shiftMonth(month, -1))} className="btn btn-secondary btn-sm shrink-0" aria-label={`Mês anterior: ${monthLabel(shiftMonth(month, -1))}`}>
        ←<span className="hidden sm:inline"> Anterior</span>
      </Link>
      <p className="min-w-0 text-center font-display text-base font-extrabold capitalize sm:min-w-44 sm:text-lg" aria-live="polite">
        {monthLabel(month)}
      </p>
      <Link href={href(shiftMonth(month, 1))} className="btn btn-secondary btn-sm shrink-0" aria-label={`Próximo mês: ${monthLabel(shiftMonth(month, 1))}`}>
        <span className="hidden sm:inline">Próximo </span>→
      </Link>
    </div>
  );
}
