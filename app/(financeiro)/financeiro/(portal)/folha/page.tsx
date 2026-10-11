import type { Metadata } from "next";
import Link from "next/link";
import { AdminHeading, Panel, ReadOnlyNotice } from "@/components/ui/admin";
import { EmptyState } from "@/components/ui/empty-state";
import { requireFinance } from "@/lib/auth/finance-guard";
import { can } from "@/lib/auth/permissions";
import { formatDate, utcToSaoPauloLocal } from "@/lib/datetime";
import { prisma } from "@/lib/db/prisma";
import type { SearchParams } from "@/lib/params";
import { monthLabel, PAYMENT_METHOD_LABELS, summarize, totalsByAthlete, type PaymentMethod } from "@/modules/finance/rules";
import { listEntries } from "@/modules/finance/service";
import { displayName } from "@/modules/squad/rules";
import { createPayrollAction } from "../actions";
import { MonthNav } from "../finance-nav";
import { Money } from "../money";
import { monthFromParams } from "../params";
import { PayrollForm } from "./payroll-form";

export const metadata: Metadata = { title: "Folha de pagamento" };

export default async function PayrollPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireFinance();
  const month = monthFromParams(await searchParams);
  const canWrite = can(user.role, "finance:write");

  const [entries, athletes, competitions, matches] = await Promise.all([
    listEntries({ month, category: "PLAYER_PAYMENT" }),
    // Inativos continuam na lista de quem recebeu, mas só ativos podem receber novos pagamentos.
    prisma.athlete.findMany({ where: { status: "ACTIVE" }, select: { id: true, name: true, nickname: true, shirtNumber: true } }),
    prisma.competition.findMany({ orderBy: [{ isActive: "desc" }, { name: "asc" }], select: { id: true, name: true } }),
    prisma.match.findMany({ orderBy: { kickoffAt: "desc" }, take: 80, include: { homeTeam: true, awayTeam: true, season: { select: { competitionId: true } } } }),
  ]);
  const total = summarize(entries).expenseCents;
  const names = new Map(entries.filter((entry) => entry.athlete).map((entry) => [entry.athlete?.id ?? "", entry.athlete ? displayName(entry.athlete) : ""]));
  const perAthlete = totalsByAthlete(entries);
  const athleteOptions = athletes
    .map((athlete) => ({ id: athlete.id, label: `${displayName(athlete)}${athlete.shirtNumber !== null ? ` (camisa ${athlete.shirtNumber})` : ""}` }))
    .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));

  return (
    <>
      <AdminHeading title="Folha de pagamento" description="Pagamentos feitos aos jogadores. Cada registro entra no caixa como despesa na categoria Jogadores." />
      {canWrite ? null : <ReadOnlyNotice />}
      <MonthNav basePath="/financeiro/folha" month={month} />

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <Panel title={`Pagamentos de ${monthLabel(month)}`}>
            {entries.length === 0 ? (
              <EmptyState title="Nenhum pagamento neste mês" description="Os pagamentos registrados aos jogadores aparecerão aqui." />
            ) : (
              <>
                <p className="mb-4 text-sm">
                  Total pago no mês:{" "}
                  <strong>
                    <Money cents={total} />
                  </strong>
                </p>
                <ul className="divide-y divide-gray-100">
                  {entries.map((entry) => {
                    const voided = entry.voidedAt !== null;
                    return (
                      <li key={entry.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                        <div className="min-w-0">
                          <p className={`font-semibold ${voided ? "text-gray-600 line-through" : ""}`}>{entry.athlete ? displayName(entry.athlete) : "Jogador removido"}</p>
                          <p className="text-sm text-gray-600">
                            {formatDate(entry.occurredOn)} · {PAYMENT_METHOD_LABELS[entry.method as PaymentMethod]} · {entry.description}
                          </p>
                          {entry.competition || entry.match ? (
                            <p className="text-sm text-gray-600">
                              {entry.competition ? entry.competition.name : ""}
                              {entry.competition && entry.match ? " · " : ""}
                              {entry.match ? `${entry.match.homeTeam.name} x ${entry.match.awayTeam.name}` : ""}
                            </p>
                          ) : null}
                          {voided ? (
                            <p className="mt-1 text-sm">
                              <span className="badge badge-strong">Estornado</span> {entry.voidReason}
                            </p>
                          ) : null}
                        </div>
                        <p className={`font-display text-lg font-extrabold ${voided ? "text-gray-600 line-through" : ""}`}>
                          <Money cents={entry.amountCents} sign="EXPENSE" />
                        </p>
                      </li>
                    );
                  })}
                </ul>
                <p className="hint mt-4">
                  Para corrigir um pagamento, estorne-o em{" "}
                  <Link href={`/financeiro/lancamentos?mes=${month}&tipo=EXPENSE`} className="link">
                    Lançamentos
                  </Link>
                  .
                </p>
              </>
            )}
          </Panel>

          {perAthlete.length > 0 ? (
            <Panel title="Total por jogador no mês">
              <table className="table">
                <caption className="sr-only">Total pago a cada jogador em {monthLabel(month)}</caption>
                <thead>
                  <tr>
                    <th scope="col" className="text-left">
                      Jogador
                    </th>
                    <th scope="col">Pagamentos</th>
                    <th scope="col">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {perAthlete.map((item) => (
                    <tr key={item.athleteId}>
                      <td className="text-left">{names.get(item.athleteId) ?? "—"}</td>
                      <td>{item.count}</td>
                      <td className="font-bold">
                        <Money cents={item.totalCents} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>
          ) : null}
        </div>

        {canWrite ? (
          <Panel title="Novo pagamento">
            {athleteOptions.length === 0 ? (
              <p className="text-sm text-gray-600">Nenhum jogador ativo no elenco. Cadastre os jogadores no painel administrativo, em Elenco.</p>
            ) : (
              <PayrollForm
                action={createPayrollAction}
                today={utcToSaoPauloLocal(new Date()).slice(0, 10)}
                athletes={athleteOptions}
                competitions={competitions.map((competition) => ({ id: competition.id, label: competition.name }))}
                matches={matches.map((match) => ({
                  id: match.id,
                  competitionId: match.season.competitionId,
                  label: `${formatDate(match.kickoffAt)} · ${match.homeTeam.name} x ${match.awayTeam.name}`,
                }))}
              />
            )}
          </Panel>
        ) : null}
      </div>
    </>
  );
}
