import type { Metadata } from "next";
import Link from "next/link";
import { AdminHeading, Panel, ReadOnlyNotice } from "@/components/ui/admin";
import { requirePagePermission } from "@/lib/auth/guard";
import { can } from "@/lib/auth/permissions";
import { formatDate } from "@/lib/datetime";
import type { SearchParams } from "@/lib/params";
import { CATEGORY_LABELS, dueStatus, ENTRY_TYPE_LABELS, monthLabel, type Category, type DueStatus } from "@/modules/finance/rules";
import { listDues, listEntries, monthSummary, overallBalance } from "@/modules/finance/service";
import { FinanceNav, MonthNav } from "./finance-nav";
import { Money, StatCard } from "./money";
import { monthFromParams } from "./params";

export const metadata: Metadata = { title: "Financeiro" };

export default async function FinanceOverviewPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requirePagePermission("finance:read");
  const month = monthFromParams(await searchParams);
  const [overall, summary, dues, entries] = await Promise.all([overallBalance(), monthSummary(month), listDues(month), listEntries({ month })]);

  const counts: Record<DueStatus, number> = { PAID: 0, WAIVED: 0, OVERDUE: 0, OPEN: 0 };
  let pendingCents = 0;
  for (const due of dues) {
    const status = dueStatus(due);
    counts[status] += 1;
    if (status === "OPEN" || status === "OVERDUE") pendingCents += due.amountCents;
  }
  const recent = entries.filter((entry) => entry.voidedAt === null).slice(0, 8);

  return (
    <>
      <AdminHeading title="Financeiro" description="Caixa do clube: receitas, despesas, mensalidades e acordos.">
        <Link href={`/admin/financeiro/exportar?mes=${month}`} className="btn btn-secondary btn-sm" prefetch={false}>
          Exportar o mês (CSV)
        </Link>
      </AdminHeading>
      {can(user.role, "finance:write") ? null : <ReadOnlyNotice />}
      <FinanceNav active="resumo" month={month} />
      <MonthNav basePath="/admin/financeiro" month={month} />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Saldo em caixa" cents={overall.balanceCents} hint="Todo o período, sem os estornos." />
        <StatCard label={`Receitas de ${monthLabel(month)}`} cents={summary.incomeCents} />
        <StatCard label={`Despesas de ${monthLabel(month)}`} cents={summary.expenseCents} />
        <StatCard label="Resultado do mês" cents={summary.balanceCents} hint="Receitas menos despesas." />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Mensalidades do mês">
          {dues.length === 0 ? (
            <p className="text-sm text-gray-600">Nenhuma mensalidade gerada para este mês.</p>
          ) : (
            <>
              <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                {(
                  [
                    ["Pagas", counts.PAID],
                    ["Em aberto", counts.OPEN],
                    ["Atrasadas", counts.OVERDUE],
                    ["Isentas", counts.WAIVED],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label} className="rounded-md border border-gray-100 p-3 text-center">
                    <dd className="font-display text-2xl font-extrabold text-primary">{value}</dd>
                    <dt className="text-gray-600">{label}</dt>
                  </div>
                ))}
              </dl>
              <p className="mt-4 text-sm">
                A receber:{" "}
                <strong>
                  <Money cents={pendingCents} />
                </strong>
              </p>
            </>
          )}
          <Link href={`/admin/financeiro/mensalidades?mes=${month}`} className="link mt-4 inline-block text-sm">
            Abrir mensalidades
          </Link>
        </Panel>

        <Panel title="Por categoria">
          {summary.byCategory.length === 0 ? (
            <p className="text-sm text-gray-600">Nenhum lançamento neste mês.</p>
          ) : (
            <table className="table">
              <caption className="sr-only">Totais por categoria em {monthLabel(month)}</caption>
              <thead>
                <tr>
                  <th scope="col" className="text-left">
                    Categoria
                  </th>
                  <th scope="col">Tipo</th>
                  <th scope="col">Lançamentos</th>
                  <th scope="col">Total</th>
                </tr>
              </thead>
              <tbody>
                {summary.byCategory.map((item) => (
                  <tr key={item.category}>
                    <td className="text-left">{CATEGORY_LABELS[item.category]}</td>
                    <td>{ENTRY_TYPE_LABELS[item.type]}</td>
                    <td>{item.count}</td>
                    <td className="font-bold">
                      <Money cents={item.totalCents} sign={item.type} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>

        <Panel title="Últimos lançamentos do mês" className="xl:col-span-2">
          {recent.length === 0 ? (
            <p className="text-sm text-gray-600">Nenhum lançamento neste mês.</p>
          ) : (
            <ul className="divide-y divide-gray-100 text-sm">
              {recent.map((entry) => (
                <li key={entry.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span>
                    <span className="text-gray-600">{formatDate(entry.occurredOn)} · </span>
                    <span className="font-semibold">{entry.description}</span>
                    <span className="text-gray-600"> · {CATEGORY_LABELS[entry.category as Category]}</span>
                  </span>
                  <span className="font-bold">
                    <Money cents={entry.amountCents} sign={entry.type} />
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Link href={`/admin/financeiro/lancamentos?mes=${month}`} className="link mt-4 inline-block text-sm">
            Ver todos os lançamentos
          </Link>
        </Panel>
      </div>
    </>
  );
}
