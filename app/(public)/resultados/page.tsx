import type { Metadata } from "next";
import Link from "next/link";
import { ResultCard } from "@/components/football/match-card";
import { MatchFilters } from "@/components/football/match-filters";
import { EmptyState } from "@/components/ui/empty-state";
import { PageTitle } from "@/components/ui/page-title";
import { param, type SearchParams } from "@/lib/params";
import { listFilterOptions } from "@/modules/competitions/service";
import { getOwnClub, listResults } from "@/modules/matches/service";

export const metadata: Metadata = {
  title: "Resultados",
  description: "Resultados das partidas do Último Gole FC.",
  alternates: { canonical: "/resultados" },
};

export default async function ResultadosPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const competicao = param(params, "competicao");
  const temporada = param(params, "temporada");

  const [options, matches, ownClub] = await Promise.all([
    listFilterOptions(),
    listResults({ competitionSlug: competicao, seasonLabel: temporada }),
    getOwnClub(),
  ]);
  const filtered = Boolean(competicao || temporada);

  return (
    <>
      <PageTitle title="Resultados" subtitle="Partidas encerradas e seus placares finais." />
      <div className="container-page py-10">
        <MatchFilters action="/resultados" competitions={options.competitions} seasonLabels={options.seasonLabels} current={{ competicao, temporada }} />
        {matches.length === 0 ? (
          <EmptyState
            title={filtered ? "Nenhum resultado encontrado" : "Nenhum resultado registrado"}
            description={filtered ? "Não há partidas encerradas para os filtros selecionados." : "Os placares aparecerão aqui depois que as partidas forem encerradas."}
          >
            <Link href="/jogos" className="btn btn-secondary">
              Ver próximos jogos
            </Link>
          </EmptyState>
        ) : (
          <ul className="space-y-4">
            {matches.map((match) => (
              <li key={match.id}>
                <ResultCard match={match} ownClubId={ownClub?.id} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
