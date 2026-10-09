import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ClubCrest } from "@/components/football/club-crest";
import { formatDate, formatTime, formatWeekday } from "@/lib/datetime";
import { prisma } from "@/lib/db/prisma";
import { EVENT_TYPE_LABELS, formatMinute, LINEUP_ROLES, LINEUP_ROLE_LABELS, sortEvents, type EventType } from "@/modules/matches/events";
import { MATCH_STATUS_LABELS, type MatchStatus } from "@/modules/matches/rules";
import { getMatch } from "@/modules/matches/service";
import { displayName } from "@/modules/squad/rules";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const match = await getMatch(id);
  if (!match) return { title: "Partida não encontrada" };
  return {
    title: `${match.homeTeam.name} x ${match.awayTeam.name}`,
    description: `${match.season.competition.name} ${match.season.label} — ${formatDate(match.kickoffAt)} às ${formatTime(match.kickoffAt)}.`,
    alternates: { canonical: `/jogos/${match.id}` },
  };
}

export default async function MatchPage({ params }: Props) {
  const { id } = await params;
  const match = await getMatch(id);
  if (!match) notFound();

  const [events, lineup] = await Promise.all([
    prisma.matchEvent.findMany({ where: { matchId: match.id }, include: { athlete: true, club: true } }),
    // Na escalação pública entram só jogadores com divulgação autorizada.
    prisma.matchLineupPlayer.findMany({ where: { matchId: match.id, athlete: { isPublished: true } }, include: { athlete: true } }),
  ]);
  const timeline = sortEvents(events);
  const lineupGroups = LINEUP_ROLES.map((role) => ({
    role,
    label: LINEUP_ROLE_LABELS[role],
    players: lineup
      .filter((entry) => entry.role === role)
      .map((entry) => entry.athlete)
      .sort((a, b) => (a.shirtNumber ?? 999) - (b.shirtNumber ?? 999) || displayName(a).localeCompare(displayName(b), "pt-BR")),
  })).filter((group) => group.players.length > 0);

  const status = match.status as MatchStatus;
  // Placar só é exibido quando existe de fato; partida sem resultado nunca aparece como 0 a 0.
  const hasScore = match.homeScore !== null && match.awayScore !== null && (status === "FINISHED" || status === "LIVE");

  return (
    <div className="container-page py-10">
      <nav aria-label="Trilha de navegação" className="mb-6 text-sm text-gray-600">
        <Link href={status === "FINISHED" ? "/resultados" : "/jogos"} className="link">
          {status === "FINISHED" ? "Resultados" : "Próximos jogos"}
        </Link>
        <span aria-hidden="true"> / </span>
        <span>Detalhes da partida</span>
      </nav>

      <article className="card overflow-hidden">
        <h1 className="sr-only">
          {match.homeTeam.name} contra {match.awayTeam.name}
        </h1>
        <header className="border-b border-gray-100 bg-gray-50 px-6 py-5 text-center">
          <p className="eyebrow">
            <Link href={`/competicoes/${match.season.competition.slug}?temporada=${encodeURIComponent(match.season.label)}`} className="hover:underline">
              {match.season.competition.name} · {match.season.label}
            </Link>
            {match.round ? ` · ${match.round}` : ""}
          </p>
          <span className={`badge mt-3 ${status === "FINISHED" ? "badge-solid" : "badge-strong"}`}>{MATCH_STATUS_LABELS[status]}</span>
        </header>

        <div className="flex items-start justify-center gap-4 px-4 py-10 sm:gap-10">
          <div className="flex flex-1 flex-col items-center gap-3 text-center">
            <ClubCrest name={match.homeTeam.name} crestPath={match.homeTeam.crestPath} size={88} />
            <p className="font-display text-lg font-extrabold uppercase sm:text-2xl">{match.homeTeam.name}</p>
            <p className="text-xs uppercase tracking-wider text-gray-600">Mandante</p>
          </div>
          <div className="pt-6 text-center">
            {hasScore ? (
              <p className="font-display text-5xl font-extrabold sm:text-6xl" aria-label={`Placar: ${match.homeScore} a ${match.awayScore}`}>
                {match.homeScore}
                <span aria-hidden="true" className="mx-2 text-2xl text-gray-400">
                  ×
                </span>
                {match.awayScore}
              </p>
            ) : (
              <p className="font-display text-3xl font-extrabold text-primary" aria-label="contra">
                VS
              </p>
            )}
          </div>
          <div className="flex flex-1 flex-col items-center gap-3 text-center">
            <ClubCrest name={match.awayTeam.name} crestPath={match.awayTeam.crestPath} size={88} />
            <p className="font-display text-lg font-extrabold uppercase sm:text-2xl">{match.awayTeam.name}</p>
            <p className="text-xs uppercase tracking-wider text-gray-600">Visitante</p>
          </div>
        </div>

        <dl className="grid gap-px border-t border-gray-100 bg-gray-100 sm:grid-cols-3">
          <div className="bg-white px-6 py-4">
            <dt className="text-xs font-bold uppercase tracking-wider text-gray-600">Data</dt>
            <dd className="mt-1 font-semibold">
              <span className="capitalize">{formatWeekday(match.kickoffAt)}</span>, {formatDate(match.kickoffAt)}
            </dd>
          </div>
          <div className="bg-white px-6 py-4">
            <dt className="text-xs font-bold uppercase tracking-wider text-gray-600">Horário</dt>
            <dd className="mt-1 font-semibold">{formatTime(match.kickoffAt)} (horário de Brasília)</dd>
          </div>
          <div className="bg-white px-6 py-4">
            <dt className="text-xs font-bold uppercase tracking-wider text-gray-600">Local</dt>
            <dd className="mt-1 font-semibold">{match.venue ?? "A definir"}</dd>
          </div>
        </dl>

        {timeline.length > 0 ? (
          <section className="border-t border-gray-100 px-6 py-6" aria-labelledby="lances">
            <h2 id="lances" className="section-title text-lg">
              Lances da partida
            </h2>
            <ol className="mt-4 space-y-2">
              {timeline.map((event) => {
                // Nome digitado tem prioridade; jogador do elenco só aparece se a divulgação foi autorizada.
                const player = event.playerName ?? (event.athlete?.isPublished ? displayName(event.athlete) : null);
                return (
                  <li key={event.id} className="flex gap-3 text-sm">
                    <span className="w-10 shrink-0 font-display font-extrabold text-primary">{formatMinute(event.minute)}</span>
                    <span>
                      <span className="font-semibold">{EVENT_TYPE_LABELS[event.type as EventType]}</span>
                      {player ? ` · ${player}` : ""}
                      <span className="text-gray-600"> ({event.club.name})</span>
                      {event.note ? <span className="block text-gray-600">{event.note}</span> : null}
                    </span>
                  </li>
                );
              })}
            </ol>
          </section>
        ) : null}

        {lineupGroups.length > 0 ? (
          <section className="border-t border-gray-100 px-6 py-6" aria-labelledby="escalacao">
            <h2 id="escalacao" className="section-title text-lg">
              Escalação do Último Gole FC
            </h2>
            <div className="mt-4 grid gap-6 sm:grid-cols-2">
              {lineupGroups.map((group) => (
                <div key={group.role}>
                  <h3 className="eyebrow mb-2">{group.label}</h3>
                  <ul className="space-y-1 text-sm">
                    {group.players.map((athlete) => (
                      <li key={athlete.id} className="flex gap-2">
                        <span className="w-7 shrink-0 font-display font-extrabold text-primary">{athlete.shirtNumber ?? "–"}</span>
                        <span>{displayName(athlete)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {match.notes ? (
          <section className="border-t border-gray-100 px-6 py-6">
            <h2 className="section-title text-lg">Informações adicionais</h2>
            <p className="mt-3 whitespace-pre-line text-gray-600">{match.notes}</p>
          </section>
        ) : null}
      </article>
    </div>
  );
}
