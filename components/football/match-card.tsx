import Link from "next/link";
import { CalendarDays, Clock, MapPin } from "lucide-react";
import { formatDate, formatTime, formatWeekday } from "@/lib/datetime";
import { MATCH_STATUS_LABELS, outcomeFor, type MatchStatus } from "@/modules/matches/rules";
import type { MatchWithTeams } from "@/modules/matches/service";
import { ClubCrest } from "./club-crest";

function Team({ club, align }: { club: MatchWithTeams["homeTeam"]; align: "left" | "right" }) {
  // No desktop o escudo fica voltado para o centro do confronto; no celular, acima do nome.
  const direction = align === "left" ? "sm:flex-row-reverse sm:text-right" : "sm:flex-row sm:text-left";
  return (
    <div className={`flex min-w-0 flex-1 flex-col items-center gap-2 text-center ${direction}`}>
      <ClubCrest name={club.name} crestPath={club.crestPath} />
      <span className="min-w-0 break-words text-sm font-bold uppercase sm:text-base">{club.name}</span>
    </div>
  );
}

function Meta({ match }: { match: MatchWithTeams }) {
  return (
    <div className="space-y-1.5 text-sm text-gray-600">
      <p className="eyebrow">
        {match.season.competition.name} · {match.season.label}
        {match.round ? ` · ${match.round}` : ""}
      </p>
      <p className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="inline-flex items-center gap-1.5">
          <CalendarDays aria-hidden="true" className="size-4 text-primary" />
          <span className="capitalize">{formatWeekday(match.kickoffAt)}</span>, {formatDate(match.kickoffAt)}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Clock aria-hidden="true" className="size-4 text-primary" />
          {formatTime(match.kickoffAt)}
        </span>
      </p>
      <p className="inline-flex items-center gap-1.5">
        <MapPin aria-hidden="true" className="size-4 text-primary" />
        {match.venue ?? "Local a definir"}
      </p>
    </div>
  );
}

/** Card de próximo jogo: competição, data, horário, local, equipes e botão "Saiba mais". */
export function MatchCard({ match }: { match: MatchWithTeams }) {
  const status = match.status as MatchStatus;
  return (
    <article className="card p-5 sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:gap-8">
        <div className="lg:w-64 lg:shrink-0">
          <Meta match={match} />
          {status !== "SCHEDULED" ? <span className="badge badge-strong mt-3">{MATCH_STATUS_LABELS[status]}</span> : null}
        </div>
        <div className="flex flex-1 items-center justify-center gap-3 sm:gap-6">
          <Team club={match.homeTeam} align="left" />
          <span aria-label="contra" className="font-display text-xl font-extrabold text-primary">
            VS
          </span>
          <Team club={match.awayTeam} align="right" />
        </div>
        <div className="lg:shrink-0">
          <Link href={`/jogos/${match.id}`} className="btn btn-primary w-full lg:w-auto" aria-label={`Saiba mais sobre ${match.homeTeam.name} contra ${match.awayTeam.name}`}>
            Saiba mais
          </Link>
        </div>
      </div>
    </article>
  );
}

const OUTCOME = {
  WIN: { letter: "V", label: "Vitória", className: "badge badge-solid" },
  DRAW: { letter: "E", label: "Empate", className: "badge" },
  LOSS: { letter: "D", label: "Derrota", className: "badge badge-strong" },
} as const;

/** Card de resultado. O desfecho do nosso clube é indicado por texto (V/E/D), não apenas por cor. */
export function ResultCard({ match, ownClubId }: { match: MatchWithTeams; ownClubId?: string | null }) {
  const outcome = ownClubId ? outcomeFor(ownClubId, match) : null;
  return (
    <article className="card p-5 sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:gap-8">
        <div className="lg:w-64 lg:shrink-0">
          <Meta match={match} />
          {outcome ? (
            <span className={`${OUTCOME[outcome].className} mt-3`}>
              <span aria-hidden="true">{OUTCOME[outcome].letter}</span> {OUTCOME[outcome].label}
            </span>
          ) : null}
        </div>
        <div className="flex flex-1 items-center justify-center gap-3 sm:gap-6">
          <Team club={match.homeTeam} align="left" />
          <p className="flex shrink-0 items-center gap-2 font-display text-3xl font-extrabold" aria-label={`Placar: ${match.homeTeam.name} ${match.homeScore}, ${match.awayTeam.name} ${match.awayScore}`}>
            <span>{match.homeScore}</span>
            <span aria-hidden="true" className="text-base text-gray-400">
              ×
            </span>
            <span>{match.awayScore}</span>
          </p>
          <Team club={match.awayTeam} align="right" />
        </div>
        <div className="lg:shrink-0">
          <Link href={`/jogos/${match.id}`} className="btn btn-secondary w-full lg:w-auto" aria-label={`Detalhes de ${match.homeTeam.name} contra ${match.awayTeam.name}`}>
            Detalhes
          </Link>
        </div>
      </div>
    </article>
  );
}
