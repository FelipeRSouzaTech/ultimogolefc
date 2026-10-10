import type { Metadata } from "next";
import Link from "next/link";
import { AdminHeading, Panel, ReadOnlyNotice } from "@/components/ui/admin";
import { EmptyState } from "@/components/ui/empty-state";
import { requirePagePermission } from "@/lib/auth/guard";
import { can } from "@/lib/auth/permissions";
import { formatDate } from "@/lib/datetime";
import { prisma } from "@/lib/db/prisma";
import { FinanceNav } from "../finance-nav";
import { Money } from "../money";

export const metadata: Metadata = { title: "Custos por jogo" };

export default async function MatchCostsPage() {
  const user = await requirePagePermission("finance:read");
  const [matches, totals] = await Promise.all([
    prisma.match.findMany({ orderBy: { kickoffAt: "desc" }, take: 60, include: { homeTeam: true, awayTeam: true, season: { include: { competition: true } } } }),
    prisma.financeEntry.groupBy({ by: ["matchId"], where: { matchId: { not: null }, voidedAt: null, type: "EXPENSE" }, _sum: { amountCents: true }, _count: { _all: true } }),
  ]);
  const byMatch = new Map<string, { cents: number; count: number }>();
  for (const group of totals) {
    if (group.matchId) byMatch.set(group.matchId, { cents: group._sum.amountCents ?? 0, count: group._count._all });
  }
  const totalCents = [...byMatch.values()].reduce((sum, item) => sum + item.cents, 0);
  const withCost = matches.filter((match) => byMatch.has(match.id)).length;

  return (
    <>
      <AdminHeading title="Custos por jogo" description="Despesas ligadas a cada partida: arbitragem, campo, transporte e outras." />
      {can(user.role, "finance:write") ? null : <ReadOnlyNotice />}
      <FinanceNav active="jogos" />

      {matches.length === 0 ? (
        <EmptyState title="Nenhuma partida cadastrada" description="As partidas cadastradas em Jogos aparecem aqui." />
      ) : (
        <Panel title="Últimas 60 partidas">
          <p className="mb-4 text-sm">
            Total nas partidas listadas:{" "}
            <strong>
              <Money cents={totalCents} />
            </strong>
            {withCost > 0 ? (
              <>
                {" "}
                · média por jogo com despesa:{" "}
                <strong>
                  <Money cents={Math.round(totalCents / withCost)} />
                </strong>
              </>
            ) : null}
          </p>
          <div className="overflow-x-auto">
            <table className="table">
              <caption className="sr-only">Despesas por partida</caption>
              <thead>
                <tr>
                  <th scope="col" className="text-left">
                    Partida
                  </th>
                  <th scope="col">Data</th>
                  <th scope="col">Despesas</th>
                  <th scope="col">Total</th>
                  <th scope="col">
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {matches.map((match) => {
                  const cost = byMatch.get(match.id);
                  return (
                    <tr key={match.id}>
                      <td className="text-left">
                        <span className="font-semibold">
                          {match.homeTeam.name} x {match.awayTeam.name}
                        </span>
                        <span className="block text-xs text-gray-600">
                          {match.season.competition.name} · {match.season.label}
                        </span>
                      </td>
                      <td className="whitespace-nowrap">{formatDate(match.kickoffAt)}</td>
                      <td>{cost?.count ?? 0}</td>
                      <td className="font-bold">{cost ? <Money cents={cost.cents} /> : "—"}</td>
                      <td>
                        <Link href={`/admin/financeiro/lancamentos?jogo=${match.id}`} className="link whitespace-nowrap text-sm">
                          {cost ? "Ver e lançar" : "Lançar despesa"}
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </>
  );
}
