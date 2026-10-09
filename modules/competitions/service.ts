import "server-only";

import { prisma } from "@/lib/db/prisma";
import { computeStandings, type StandingRow } from "./standings";

export type StandingRowView = StandingRow & { crestPath: string | null; isOwnClub: boolean };

export type SeasonStandings = {
  mode: "AUTO" | "MANUAL";
  rows: StandingRowView[];
};

/**
 * Classificação de uma temporada.
 * AUTO: calculada agora, a partir das partidas encerradas e das regras da temporada.
 * MANUAL: lê os valores informados no painel (não é apresentada como cálculo automático).
 */
export async function getSeasonStandings(seasonId: string): Promise<SeasonStandings | null> {
  const season = await prisma.season.findUnique({
    where: { id: seasonId },
    include: { teams: { include: { club: true } } },
  });
  if (!season) return null;

  const clubs = new Map<string, { crestPath: string | null; isOwnClub: boolean }>();
  for (const team of season.teams) clubs.set(team.clubId, team.club);
  const decorate = (row: StandingRow): StandingRowView => {
    const club = clubs.get(row.teamId);
    return { ...row, crestPath: club?.crestPath ?? null, isOwnClub: club?.isOwnClub ?? false };
  };

  if (season.standingsMode === "MANUAL") {
    const overrides = await prisma.standingOverride.findMany({
      where: { seasonId },
      include: { club: true },
      orderBy: { position: "asc" },
    });
    return {
      mode: "MANUAL",
      rows: overrides.map((item) => ({
        position: item.position,
        teamId: item.clubId,
        teamName: item.club.name,
        played: item.played,
        wins: item.wins,
        draws: item.draws,
        losses: item.losses,
        goalsFor: item.goalsFor,
        goalsAgainst: item.goalsAgainst,
        goalDifference: item.goalsFor - item.goalsAgainst,
        points: item.points,
        crestPath: item.club.crestPath,
        isOwnClub: item.club.isOwnClub,
      })),
    };
  }

  const matches = await prisma.match.findMany({
    where: { seasonId, status: "FINISHED" },
    select: { homeTeamId: true, awayTeamId: true, homeScore: true, awayScore: true, status: true },
  });
  const rows = computeStandings(
    season.teams.map((team) => ({ id: team.clubId, name: team.club.name })),
    matches,
    {
      pointsWin: season.pointsWin,
      pointsDraw: season.pointsDraw,
      pointsLoss: season.pointsLoss,
      tiebreakers: season.tiebreakers,
    },
  );
  return { mode: "AUTO", rows: rows.map(decorate) };
}

/** Opções para os filtros públicos de competição e temporada. */
export async function listFilterOptions() {
  const [competitions, seasons] = await Promise.all([
    prisma.competition.findMany({ orderBy: { name: "asc" }, select: { name: true, slug: true } }),
    prisma.season.findMany({ distinct: ["label"], orderBy: { label: "desc" }, select: { label: true } }),
  ]);
  return { competitions, seasonLabels: seasons.map((season) => season.label) };
}

/** Temporada em destaque na página inicial: a marcada como atual (priorizando a do nosso clube). */
export async function getFeaturedSeason() {
  const seasons = await prisma.season.findMany({
    where: { isCurrent: true, competition: { isActive: true } },
    include: { competition: true, teams: { include: { club: { select: { isOwnClub: true } } } } },
    orderBy: { updatedAt: "desc" },
  });
  return seasons.find((season) => season.teams.some((team) => team.club.isOwnClub)) ?? seasons[0] ?? null;
}
