import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { BusinessError } from "@/lib/action";
import { audit } from "@/lib/audit";
import { validateMatch, type MatchInput, type MatchStatus } from "./rules";

export const matchInclude = {
  homeTeam: true,
  awayTeam: true,
  season: { include: { competition: true } },
} satisfies Prisma.MatchInclude;

export type MatchWithTeams = Prisma.MatchGetPayload<{ include: typeof matchInclude }>;

export type MatchFilters = { competitionSlug?: string; seasonLabel?: string };

function seasonWhere(filters: MatchFilters): Prisma.MatchWhereInput {
  if (!filters.competitionSlug && !filters.seasonLabel) return {};
  return {
    season: {
      ...(filters.seasonLabel ? { label: filters.seasonLabel } : {}),
      ...(filters.competitionSlug ? { competition: { slug: filters.competitionSlug } } : {}),
    },
  };
}

export const UPCOMING_STATUSES: MatchStatus[] = ["SCHEDULED", "LIVE", "POSTPONED"];

/** Próximos jogos: nunca inclui partidas encerradas. */
export async function listUpcomingMatches(filters: MatchFilters & { status?: MatchStatus } = {}, take = 50) {
  const statuses = filters.status && filters.status !== "FINISHED" ? [filters.status] : UPCOMING_STATUSES;
  return prisma.match.findMany({
    where: { status: { in: statuses }, ...seasonWhere(filters) },
    include: matchInclude,
    orderBy: { kickoffAt: "asc" },
    take,
  });
}

/** Resultados: somente partidas encerradas e com placar completo. */
export async function listResults(filters: MatchFilters = {}, take = 50) {
  return prisma.match.findMany({
    where: { status: "FINISHED", homeScore: { not: null }, awayScore: { not: null }, ...seasonWhere(filters) },
    include: matchInclude,
    orderBy: { kickoffAt: "desc" },
    take,
  });
}

export async function getMatch(id: string) {
  return prisma.match.findUnique({ where: { id }, include: matchInclude });
}

export async function getOwnClub() {
  return prisma.club.findFirst({ where: { isOwnClub: true } });
}

export async function nextOwnMatch(clubId: string) {
  return prisma.match.findFirst({
    where: {
      status: { in: ["SCHEDULED", "LIVE"] },
      kickoffAt: { gte: new Date(Date.now() - 3 * 60 * 60 * 1000) },
      OR: [{ homeTeamId: clubId }, { awayTeamId: clubId }],
    },
    include: matchInclude,
    orderBy: { kickoffAt: "asc" },
  });
}

export async function lastOwnResults(clubId: string, take = 3) {
  return prisma.match.findMany({
    where: {
      status: "FINISHED",
      homeScore: { not: null },
      awayScore: { not: null },
      OR: [{ homeTeamId: clubId }, { awayTeamId: clubId }],
    },
    include: matchInclude,
    orderBy: { kickoffAt: "desc" },
    take,
  });
}

export type MatchSaveInput = MatchInput & {
  seasonId: string;
  venue: string | null;
  round: string | null;
  notes: string | null;
};

const snapshot = (match: {
  seasonId: string;
  homeTeamId: string;
  awayTeamId: string;
  kickoffAt: Date;
  status: string;
  homeScore: number | null;
  awayScore: number | null;
  venue: string | null;
  round: string | null;
}) => ({
  seasonId: match.seasonId,
  homeTeamId: match.homeTeamId,
  awayTeamId: match.awayTeamId,
  kickoffAt: match.kickoffAt.toISOString(),
  status: match.status,
  homeScore: match.homeScore,
  awayScore: match.awayScore,
  venue: match.venue,
  round: match.round,
});

export class MatchValidationError extends Error {
  constructor(public readonly errors: Record<string, string[]>) {
    super("Partida inválida.");
    this.name = "MatchValidationError";
  }
}

/**
 * Cria ou atualiza uma partida dentro de uma transação, validando os participantes da temporada
 * e registrando o histórico (antes/depois) na auditoria. A classificação é calculada na leitura,
 * então qualquer correção de resultado se reflete nela imediatamente e sem risco de inconsistência.
 */
export async function saveMatch(input: MatchSaveInput, userId: string, matchId?: string) {
  return prisma.$transaction(async (tx) => {
    const season = await tx.season.findUnique({ where: { id: input.seasonId }, include: { teams: true } });
    if (!season) throw new BusinessError("Temporada não encontrada.");

    const checked = validateMatch(
      input,
      season.teams.map((team) => team.clubId),
    );
    if (!checked.ok) throw new MatchValidationError(checked.errors);

    const data = {
      seasonId: input.seasonId,
      homeTeamId: checked.value.homeTeamId,
      awayTeamId: checked.value.awayTeamId,
      kickoffAt: checked.value.kickoffAt,
      status: checked.value.status,
      homeScore: checked.value.homeScore,
      awayScore: checked.value.awayScore,
      venue: input.venue,
      round: input.round,
      notes: input.notes,
    };

    if (!matchId) {
      const created = await tx.match.create({ data });
      await audit({ userId, action: "match.create", entity: "Match", entityId: created.id, after: snapshot(created) }, tx);
      return created;
    }

    const previous = await tx.match.findUnique({ where: { id: matchId } });
    if (!previous) throw new BusinessError("Partida não encontrada.");
    const updated = await tx.match.update({ where: { id: matchId }, data });
    const resultChanged =
      previous.homeScore !== updated.homeScore || previous.awayScore !== updated.awayScore || previous.status !== updated.status;
    await audit(
      {
        userId,
        action: resultChanged ? "match.result" : "match.update",
        entity: "Match",
        entityId: updated.id,
        before: snapshot(previous),
        after: snapshot(updated),
      },
      tx,
    );
    return updated;
  });
}

export async function deleteMatch(matchId: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    const previous = await tx.match.findUnique({ where: { id: matchId } });
    if (!previous) throw new BusinessError("Partida não encontrada.");
    await tx.match.delete({ where: { id: matchId } });
    await audit({ userId, action: "match.delete", entity: "Match", entityId: matchId, before: snapshot(previous) }, tx);
  });
}
