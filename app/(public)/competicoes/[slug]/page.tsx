import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ClubCrest } from "@/components/football/club-crest";
import { MatchCard, ResultCard } from "@/components/football/match-card";
import { StandingsTable } from "@/components/football/standings-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageTitle } from "@/components/ui/page-title";
import { prisma } from "@/lib/db/prisma";
import { param, type SearchParams } from "@/lib/params";
import { getSeasonStandings } from "@/modules/competitions/service";
import { TIEBREAKER_LABELS } from "@/modules/competitions/standings";
import { getOwnClub, listResults, listUpcomingMatches } from "@/modules/matches/service";

type Props = { params: Promise<{ slug: string }>; searchParams: SearchParams };

async function loadCompetition(slug: string) {
  return prisma.competition.findUnique({
    where: { slug },
    include: { seasons: { orderBy: [{ isCurrent: "desc" }, { label: "desc" }] } },
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const competition = await loadCompetition(slug);
  if (!competition) return { title: "Competição não encontrada" };
  return {
    title: competition.name,
    description: competition.description?.slice(0, 160) ?? `Calendário, resultados e classificação de ${competition.name}.`,
    alternates: { canonical: `/competicoes/${competition.slug}` },
  };
}

export default async function CompetitionPage({ params, searchParams }: Props) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const competition = await loadCompetition(slug);
  if (!competition) notFound();

  const wanted = param(query, "temporada");
  const season = competition.seasons.find((item) => item.label === wanted) ?? competition.seasons[0] ?? null;

  if (!season) {
    return (
      <>
        <PageTitle title={competition.name} subtitle={competition.description ?? undefined} />
        <div className="container-page py-10">
          <EmptyState title="Nenhuma temporada cadastrada" description="Os dados desta competição ainda não foram publicados." />
        </div>
      </>
    );
  }

  const filters = { competitionSlug: competition.slug, seasonLabel: season.label };
  const [standings, upcoming, results, ownClub, participants] = await Promise.all([
    getSeasonStandings(season.id),
    listUpcomingMatches(filters),
    listResults(filters),
    getOwnClub(),
    prisma.competitionTeam.findMany({ where: { seasonId: season.id }, include: { club: true }, orderBy: { club: { name: "asc" } } }),
  ]);

  return (
    <>
      <PageTitle title={competition.name} subtitle={`Temporada ${season.label}`} />
      <div className="container-page space-y-12 py-10">
        {competition.seasons.length > 1 ? (
          <nav aria-label="Temporadas" className="flex flex-wrap gap-2">
            {competition.seasons.map((item) => (
              <Link
                key={item.id}
                href={`/competicoes/${competition.slug}?temporada=${encodeURIComponent(item.label)}`}
                className={`btn btn-sm ${item.id === season.id ? "btn-primary" : "btn-secondary"}`}
                aria-current={item.id === season.id ? "page" : undefined}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        ) : null}

        <section aria-labelledby="classificacao">
          <h2 id="classificacao" className="section-title mb-5">
            Classificação
          </h2>
          {!standings || standings.rows.length === 0 ? (
            <EmptyState title="Classificação indisponível" description="A tabela será exibida quando houver participantes cadastrados nesta temporada." />
          ) : (
            <div className="card p-4 sm:p-6">
              <StandingsTable rows={standings.rows} mode={standings.mode} caption={`Classificação — ${competition.name} ${season.label}`} />
              {standings.mode === "AUTO" ? (
                <p className="hint">
                  Pontuação: {season.pointsWin} por vitória, {season.pointsDraw} por empate, {season.pointsLoss} por derrota.
                  {season.tiebreakers.length > 0
                    ? ` Critérios de desempate, em ordem: ${season.tiebreakers.map((item) => TIEBREAKER_LABELS[item].toLowerCase()).join("; ")}.`
                    : ""}
                </p>
              ) : null}
            </div>
          )}
        </section>

        <section aria-labelledby="calendario">
          <h2 id="calendario" className="section-title mb-5">
            Calendário
          </h2>
          {upcoming.length === 0 ? (
            <EmptyState title="Nenhum jogo agendado" description="Não há partidas futuras cadastradas nesta temporada." />
          ) : (
            <ul className="space-y-4">
              {upcoming.map((match) => (
                <li key={match.id}>
                  <MatchCard match={match} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="resultados">
          <h2 id="resultados" className="section-title mb-5">
            Resultados
          </h2>
          {results.length === 0 ? (
            <EmptyState title="Nenhum resultado registrado" description="Os placares aparecerão aqui depois que as partidas forem encerradas." />
          ) : (
            <ul className="space-y-4">
              {results.map((match) => (
                <li key={match.id}>
                  <ResultCard match={match} ownClubId={ownClub?.id} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="participantes">
          <h2 id="participantes" className="section-title mb-5">
            Participantes
          </h2>
          {participants.length === 0 ? (
            <EmptyState title="Nenhum participante cadastrado" />
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {participants.map((item) => (
                <li key={item.clubId} className="card flex items-center gap-3 p-4">
                  <ClubCrest name={item.club.name} crestPath={item.club.crestPath} size={36} />
                  <span className="text-sm font-bold uppercase">{item.club.name}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {season.regulation ? (
          <section aria-labelledby="regulamento">
            <h2 id="regulamento" className="section-title mb-5">
              Regulamento
            </h2>
            <div className="card p-6">
              <p className="whitespace-pre-line text-gray-600">{season.regulation}</p>
            </div>
          </section>
        ) : null}
      </div>
    </>
  );
}
