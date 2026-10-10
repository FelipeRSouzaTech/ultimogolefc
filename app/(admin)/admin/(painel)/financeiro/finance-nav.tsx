import Link from "next/link";
import { monthLabel, shiftMonth } from "@/modules/finance/rules";

const TABS = [
  { id: "resumo", href: "/admin/financeiro", label: "Resumo" },
  { id: "lancamentos", href: "/admin/financeiro/lancamentos", label: "Lançamentos" },
  { id: "mensalidades", href: "/admin/financeiro/mensalidades", label: "Mensalidades" },
  { id: "acordos", href: "/admin/financeiro/acordos", label: "Patrocínios e doações" },
  { id: "jogos", href: "/admin/financeiro/jogos", label: "Custos por jogo" },
] as const;

export type FinanceTab = (typeof TABS)[number]["id"];

/** Abas do financeiro. As telas que trabalham por mês mantêm o mês ao trocar de aba. */
export function FinanceNav({ active, month }: { active: FinanceTab; month?: string }) {
  return (
    <nav aria-label="Seções do financeiro" className="mb-6 flex flex-wrap gap-2">
      {TABS.map((tab) => (
        <Link
          key={tab.id}
          href={month && tab.id !== "acordos" && tab.id !== "jogos" ? `${tab.href}?mes=${month}` : tab.href}
          className={`btn btn-sm ${tab.id === active ? "btn-primary" : "btn-secondary"}`}
          aria-current={tab.id === active ? "page" : undefined}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

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
