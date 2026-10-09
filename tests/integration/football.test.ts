import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { getSeasonStandings } from "@/modules/competitions/service";
import { deleteMatch, listResults, listUpcomingMatches, MatchValidationError, saveMatch, type MatchSaveInput } from "@/modules/matches/service";
import { getPublicArticle, listPublicNews } from "@/modules/news/service";

// Cada execução cria os próprios dados com um sufixo único e os apaga no fim.
const run = randomUUID().slice(0, 8);
const ids = { user: "", clubs: [] as string[], competition: "", season: "", outsider: "" };
const past = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

const input = (overrides: Partial<MatchSaveInput> = {}): MatchSaveInput => ({
  seasonId: ids.season,
  homeTeamId: ids.clubs[0] ?? "",
  awayTeamId: ids.clubs[1] ?? "",
  kickoffAt: past,
  status: "FINISHED",
  homeScore: 2,
  awayScore: 0,
  venue: null,
  round: null,
  notes: null,
  ...overrides,
});

beforeAll(async () => {
  const user = await prisma.user.create({ data: { name: "Teste", email: `teste-${run}@exemplo.com`, passwordHash: "x", role: "FOOTBALL_MANAGER" } });
  ids.user = user.id;
  for (const letter of ["A", "B", "C"]) {
    const club = await prisma.club.create({ data: { name: `Clube ${letter} ${run}`, slug: `clube-${letter.toLowerCase()}-${run}` } });
    ids.clubs.push(club.id);
  }
  const outsider = await prisma.club.create({ data: { name: `Clube de fora ${run}`, slug: `clube-fora-${run}` } });
  ids.outsider = outsider.id;
  const competition = await prisma.competition.create({ data: { name: `Copa ${run}`, slug: `copa-${run}` } });
  ids.competition = competition.id;
  const season = await prisma.season.create({
    data: { competitionId: competition.id, label: "2026", teams: { create: ids.clubs.map((clubId) => ({ clubId })) } },
  });
  ids.season = season.id;
});

afterAll(async () => {
  await prisma.auditLog.deleteMany({ where: { userId: ids.user } });
  await prisma.match.deleteMany({ where: { seasonId: ids.season } });
  await prisma.season.deleteMany({ where: { id: ids.season } });
  await prisma.competition.deleteMany({ where: { id: ids.competition } });
  await prisma.club.deleteMany({ where: { id: { in: [...ids.clubs, ids.outsider] } } });
  await prisma.newsArticle.deleteMany({ where: { slug: { endsWith: run } } });
  await prisma.user.deleteMany({ where: { id: ids.user } });
  await prisma.$disconnect();
});

describe("partidas e classificação no banco", () => {
  let matchId = "";

  it("grava a partida, registra auditoria e reflete o resultado na classificação", async () => {
    const match = await saveMatch(input(), ids.user);
    matchId = match.id;

    const stored = await prisma.match.findUnique({ where: { id: match.id } });
    expect(stored?.homeScore).toBe(2);
    expect(await prisma.auditLog.count({ where: { entity: "Match", entityId: match.id, action: "match.create" } })).toBe(1);

    const standings = await getSeasonStandings(ids.season);
    expect(standings?.mode).toBe("AUTO");
    expect(standings?.rows[0]).toMatchObject({ teamId: ids.clubs[0], points: 3, wins: 1, goalDifference: 2 });
    expect(standings?.rows).toHaveLength(3);
  });

  it("corrigir o resultado atualiza a classificação e guarda o antes e o depois", async () => {
    await saveMatch(input({ homeScore: 0, awayScore: 1 }), ids.user, matchId);

    const standings = await getSeasonStandings(ids.season);
    expect(standings?.rows[0]).toMatchObject({ teamId: ids.clubs[1], points: 3 });
    expect(standings?.rows.find((row) => row.teamId === ids.clubs[0])).toMatchObject({ points: 0, losses: 1 });

    const log = await prisma.auditLog.findFirst({ where: { entity: "Match", entityId: matchId, action: "match.result" } });
    expect(log?.before).toMatchObject({ homeScore: 2, awayScore: 0 });
    expect(log?.after).toMatchObject({ homeScore: 0, awayScore: 1 });
  });

  it("partida adiada deixa de contar e perde o placar", async () => {
    await saveMatch(input({ status: "POSTPONED" }), ids.user, matchId);
    const stored = await prisma.match.findUnique({ where: { id: matchId } });
    expect(stored?.homeScore).toBeNull();
    const standings = await getSeasonStandings(ids.season);
    expect(standings?.rows.every((row) => row.played === 0 && row.points === 0)).toBe(true);
  });

  it("recusa equipe que não participa da temporada e não grava nada", async () => {
    const before = await prisma.match.count({ where: { seasonId: ids.season } });
    let error: unknown;
    try {
      await saveMatch(input({ awayTeamId: ids.outsider }), ids.user);
    } catch (caught) {
      error = caught;
    }
    expect(error instanceof MatchValidationError).toBe(true);
    expect(await prisma.match.count({ where: { seasonId: ids.season } })).toBe(before);
  });

  it("recusa encerrar partida futura", async () => {
    let error: unknown;
    try {
      await saveMatch(input({ kickoffAt: future }), ids.user);
    } catch (caught) {
      error = caught;
    }
    expect(error instanceof MatchValidationError).toBe(true);
  });

  it("separa próximos jogos de resultados e nunca lista partida sem placar como resultado", async () => {
    const scheduled = await saveMatch(input({ homeTeamId: ids.clubs[1] ?? "", awayTeamId: ids.clubs[2] ?? "", kickoffAt: future, status: "SCHEDULED", homeScore: null, awayScore: null }), ids.user);
    const filters = { competitionSlug: `copa-${run}` };
    const upcoming = await listUpcomingMatches(filters);
    const results = await listResults(filters);
    expect(upcoming.some((match) => match.id === scheduled.id)).toBe(true);
    expect(results.some((match) => match.id === scheduled.id)).toBe(false);
    expect(results.every((match) => match.homeScore !== null && match.awayScore !== null)).toBe(true);
  });

  it("excluir a partida remove o registro e mantém a auditoria", async () => {
    await deleteMatch(matchId, ids.user);
    expect(await prisma.match.findUnique({ where: { id: matchId } })).toBeNull();
    expect(await prisma.auditLog.count({ where: { entity: "Match", entityId: matchId, action: "match.delete" } })).toBe(1);
  });
});

describe("visibilidade de notícias no banco", () => {
  const article = (suffix: string, status: "DRAFT" | "PUBLISHED" | "ARCHIVED", publishedAt: Date | null) =>
    prisma.newsArticle.create({
      data: { title: `Notícia ${suffix} ${run}`, slug: `${suffix}-${run}`, summary: "Resumo de teste.", content: "Conteúdo de teste.", status, publishedAt },
    });

  it("só entrega ao portal o que está publicado e com data alcançada", async () => {
    await article("publicada", "PUBLISHED", past);
    await article("rascunho", "DRAFT", null);
    await article("agendada", "PUBLISHED", future);
    await article("arquivada", "ARCHIVED", past);

    expect((await getPublicArticle(`publicada-${run}`))?.title).toBe(`Notícia publicada ${run}`);
    expect(await getPublicArticle(`rascunho-${run}`)).toBeNull();
    expect(await getPublicArticle(`agendada-${run}`)).toBeNull();
    expect(await getPublicArticle(`arquivada-${run}`)).toBeNull();

    const found = await listPublicNews({ search: run });
    expect(found.items.map((item) => item.slug)).toEqual([`publicada-${run}`]);
  });
});
