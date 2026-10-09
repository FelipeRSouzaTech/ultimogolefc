import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ClubCrest } from "@/components/football/club-crest";
import { formatDate, formatTime, formatWeekday } from "@/lib/datetime";
import { MATCH_STATUS_LABELS, type MatchStatus } from "@/modules/matches/rules";
import { getMatch } from "@/modules/matches/service";

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
