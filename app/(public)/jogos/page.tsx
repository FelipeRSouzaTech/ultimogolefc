import type { Metadata } from "next";
import Link from "next/link";
import { MatchCard } from "@/components/football/match-card";
import { MatchFilters } from "@/components/football/match-filters";
import { EmptyState } from "@/components/ui/empty-state";
import { PageTitle } from "@/components/ui/page-title";
import { param, type SearchParams } from "@/lib/params";
import { listFilterOptions } from "@/modules/competitions/service";
import { MATCH_STATUSES, MATCH_STATUS_LABELS, type MatchStatus } from "@/modules/matches/rules";
import { listUpcomingMatches } from "@/modules/matches/service";

export const metadata: Metadata = {
  title: "Próximos jogos",
  description: "Acompanhe os próximos jogos do Último Gole FC.",
  alternates: { canonical: "/jogos" },
};

const FILTER_STATUSES: MatchStatus[] = ["SCHEDULED", "LIVE", "POSTPONED", "CANCELLED"];

export default async function JogosPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const competicao = param(params, "competicao");
  const temporada = param(params, "temporada");
  const statusParam = param(params, "status");
  const status = (MATCH_STATUSES as readonly string[]).includes(statusParam ?? "") ? (statusParam as MatchStatus) : undefined;

  const [options, matches] = await Promise.all([
    listFilterOptions(),
    listUpcomingMatches({ competitionSlug: competicao, seasonLabel: temporada, status }),
  ]);
  const filtered = Boolean(competicao || temporada || status);

  return (
    <>
      <PageTitle title="Próximos jogos" subtitle="Acompanhe os próximos jogos do Último Gole FC." />
      <div className="container-page py-10">
        <MatchFilters
          action="/jogos"
          competitions={options.competitions}
          seasonLabels={options.seasonLabels}
          statuses={FILTER_STATUSES.map((value) => ({ value, label: MATCH_STATUS_LABELS[value] }))}
          current={{ competicao, temporada, status }}
        />
        {matches.length === 0 ? (
          <EmptyState
            title={filtered ? "Nenhum jogo encontrado" : "Nenhum jogo agendado"}
            description={filtered ? "Não há jogos para os filtros selecionados." : "Assim que novas partidas forem confirmadas, elas aparecerão aqui."}
          >
            <Link href="/resultados" className="btn btn-secondary">
              Ver resultados
            </Link>
          </EmptyState>
        ) : (
          <ul className="space-y-4">
            {matches.map((match) => (
              <li key={match.id}>
                <MatchCard match={match} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
