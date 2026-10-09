import type { NextRequest } from "next/server";
import { fail, ok, serverError } from "@/lib/api";
import { listResults, listUpcomingMatches, type MatchWithTeams } from "@/modules/matches/service";

export const dynamic = "force-dynamic";

const serialize = (match: MatchWithTeams) => ({
  id: match.id,
  competition: { name: match.season.competition.name, slug: match.season.competition.slug },
  season: match.season.label,
  round: match.round,
  kickoffAt: match.kickoffAt.toISOString(),
  venue: match.venue,
  status: match.status,
  home: { id: match.homeTeam.id, name: match.homeTeam.name, score: match.homeScore },
  away: { id: match.awayTeam.id, name: match.awayTeam.name, score: match.awayScore },
});

/** GET /api/matches?tipo=proximos|resultados&competicao=<slug>&temporada=<rótulo> */
export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams;
  const type = query.get("tipo") ?? "proximos";
  if (type !== "proximos" && type !== "resultados") return fail(400, 'Parâmetro "tipo" deve ser "proximos" ou "resultados".');
  const filters = {
    competitionSlug: query.get("competicao")?.slice(0, 100) || undefined,
    seasonLabel: query.get("temporada")?.slice(0, 30) || undefined,
  };
  try {
    const matches = type === "proximos" ? await listUpcomingMatches(filters) : await listResults(filters);
    return ok(matches.map(serialize));
  } catch (error) {
    return serverError(error);
  }
}
