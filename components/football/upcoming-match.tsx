import Link from "next/link";
import { formatDate, formatTime, formatWeekday } from "@/lib/datetime";
import type { MatchWithTeams } from "@/modules/matches/service";
import { ClubCrest } from "./club-crest";
import { MatchCountdown } from "./match-countdown";

/** Faixa da página inicial com a contagem regressiva para a partida mais próxima. */
export function CountdownBar({ match }: { match: MatchWithTeams }) {
  return (
    <section aria-label="Contagem regressiva para o próximo jogo" className="bg-white py-4">
      <div className="container-page">
        <div className="grid items-center gap-5 rounded-lg bg-primary px-5 py-5 text-white shadow-card sm:px-8 md:grid-cols-[1fr_auto_1fr]">
          <p className="flex items-center justify-center gap-3 md:justify-start">
            <ClubCrest name={match.homeTeam.name} crestPath={match.homeTeam.crestPath} size={52} />
            <span aria-hidden="true" className="font-display text-lg font-extrabold">
              ×
            </span>
            <ClubCrest name={match.awayTeam.name} crestPath={match.awayTeam.crestPath} size={52} />
            <span className="sr-only">
              {match.homeTeam.name} contra {match.awayTeam.name}
            </span>
          </p>
          <MatchCountdown kickoffIso={match.kickoffAt.toISOString()} />
          <div className="flex justify-center md:justify-end">
            <Link href={`/jogos/${match.id}`} className="btn btn-inverse btn-sm" aria-label={`Saiba mais sobre ${match.homeTeam.name} contra ${match.awayTeam.name}`}>
              Saiba mais
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Cartão vertical de próximo jogo: categoria, campeonato e rodada, escudos, local, data e botão. */
export function UpcomingMatchCard({ match, categoryLabel }: { match: MatchWithTeams; categoryLabel: string }) {
  return (
    <article className="card flex h-full flex-col items-center p-5 text-center">
      <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600">{categoryLabel}</span>
      <p className="mt-4 text-sm font-bold">
        {match.season.competition.name} {match.season.label}
      </p>
      {match.round ? <p className="text-sm text-gray-600">{match.round}</p> : null}

      <div className="mt-5 flex items-center justify-center gap-4">
        <ClubCrest name={match.homeTeam.name} crestPath={match.homeTeam.crestPath} size={60} />
        <span aria-hidden="true" className="text-xs font-extrabold uppercase text-primary">
          vs
        </span>
        <ClubCrest name={match.awayTeam.name} crestPath={match.awayTeam.crestPath} size={60} />
      </div>
      <p className="mt-4 text-sm">
        <strong>{match.homeTeam.name}</strong> <span className="text-gray-600">vs</span> <strong>{match.awayTeam.name}</strong>
      </p>

      <div className="mt-5 w-full border-t border-gray-100 pt-4">
        <p className="font-bold">{match.venue ?? "Local a definir"}</p>
        <p className="text-sm text-gray-600">
          <span className="capitalize">{formatWeekday(match.kickoffAt)}</span>, {formatDate(match.kickoffAt)}, {formatTime(match.kickoffAt)}
        </p>
      </div>

      <div className="mt-auto pt-5">
        <Link href={`/jogos/${match.id}`} className="btn btn-primary btn-sm" aria-label={`Saiba mais sobre ${match.homeTeam.name} contra ${match.awayTeam.name}`}>
          Saiba mais
        </Link>
      </div>
    </article>
  );
}
