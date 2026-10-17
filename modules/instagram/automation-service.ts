import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { Prisma } from "@prisma/client";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/db/prisma";
import { renderCallArt, renderLineupArt, renderNewsArt, renderResultArt, toPngDataUri } from "@/lib/instagram/art";
import { CREST_PATH, SITE_NAME, SITE_URL } from "@/lib/site";
import { readLocal, s3PublicUrl } from "@/lib/storage";
import { storeGeneratedImage } from "@/modules/media/service";
import { isValidKey, pathToKey } from "@/modules/media/rules";
import { displayName, groupByPosition, resolveCategoryLabels } from "@/modules/squad/rules";
import {
  AUTOMATION_KINDS,
  AUTOMATION_TIMING,
  callHeadline,
  clubHashtag,
  countScorers,
  formatScorers,
  newsCaption,
  planAutomationPosts,
  resultCaption,
  resultOutcome,
  shortKickoff,
  type AutomationKind,
  type AutomationState,
  type PlannedPost,
} from "./automations";
import type { InstagramFormat } from "./rules";

// --- Leitura de imagens do portal (escudos, capas) -------------------------------------------------

/** Lê uma imagem do portal pelo caminho salvo no banco (/brand/... ou /midia/...). Null se não achar. */
async function readPortalImage(imagePath: string | null | undefined): Promise<Uint8Array | null> {
  if (!imagePath) return null;
  try {
    const key = pathToKey(imagePath);
    if (key && isValidKey(key)) {
      const remote = s3PublicUrl(key);
      if (remote) {
        const response = await fetch(remote, { signal: AbortSignal.timeout(15_000) });
        return response.ok ? new Uint8Array(await response.arrayBuffer()) : null;
      }
      const local = await readLocal(key);
      return local ? new Uint8Array(local) : null;
    }
    // Arquivos estáticos do projeto (ex.: /brand/escudo.png), sem sair da pasta public.
    if (/^\/(?!\/)[A-Za-z0-9._\-/]+\.(png|jpg|jpeg|webp|svg)$/.test(imagePath) && !imagePath.includes("..")) {
      return new Uint8Array(await readFile(path.join(process.cwd(), "public", imagePath)));
    }
  } catch {
    // Imagem indisponível: a arte sai com as iniciais no lugar do escudo.
  }
  return null;
}

async function imageDataUri(imagePath: string | null | undefined, maxSize = 400): Promise<string | null> {
  const bytes = await readPortalImage(imagePath);
  return bytes ? toPngDataUri(bytes, maxSize) : null;
}

// --- Estado das automações ------------------------------------------------------------------------

export async function listAutomations(): Promise<Record<AutomationKind, AutomationState>> {
  const rows = await prisma.instagramAutomation.findMany();
  const result = {} as Record<AutomationKind, AutomationState>;
  for (const kind of AUTOMATION_KINDS) {
    const row = rows.find((item) => item.kind === kind);
    result[kind] = { enabled: row?.enabled ?? false, enabledAt: row?.enabledAt ?? null };
  }
  return result;
}

// --- Dados das partidas ---------------------------------------------------------------------------

const matchInclude = {
  homeTeam: true,
  awayTeam: true,
  season: { include: { competition: true } },
  events: { include: { athlete: true }, orderBy: [{ minute: "asc" }, { createdAt: "asc" }] },
  lineup: { include: { athlete: true } },
} satisfies Prisma.MatchInclude;

type FullMatch = Prisma.MatchGetPayload<{ include: typeof matchInclude }>;

function sides(match: FullMatch, ownClubId: string) {
  const ownIsHome = match.homeTeamId === ownClubId;
  return { ownIsHome, own: ownIsHome ? match.homeTeam : match.awayTeam, opponent: ownIsHome ? match.awayTeam : match.homeTeam };
}

function teamName(club: { name: string; shortName: string | null }): string {
  return club.shortName?.trim() || club.name;
}

/** Gols do nosso clube, só com nomes que podem aparecer em público (mesma regra da página do jogo). */
function ownScorers(match: FullMatch, ownClubId: string) {
  return countScorers(
    match.events
      .filter((event) => event.clubId === ownClubId && (event.type === "GOAL" || event.type === "PENALTY_GOAL"))
      .map((event) => event.playerName ?? (event.athlete?.isPublished ? displayName(event.athlete) : null)),
  );
}

// --- Geração de cada tipo -------------------------------------------------------------------------
// Cada função devolve o JPEG e a legenda; quem grava é runAutomations (a prévia do painel só mostra).

type Built = { jpeg: Buffer; caption: string | null; name: string };

async function buildResult(match: FullMatch, ownClubId: string, format: InstagramFormat, categoryLabel: string | null): Promise<Built> {
  const { ownIsHome } = sides(match, ownClubId);
  const homeScore = match.homeScore ?? 0;
  const awayScore = match.awayScore ?? 0;
  const scorers = ownScorers(match, ownClubId);
  const competition = match.season.competition.name;
  const [homeCrest, awayCrest] = await Promise.all([
    imageDataUri(match.homeTeam.crestPath ?? (match.homeTeam.isOwnClub ? CREST_PATH : null)),
    imageDataUri(match.awayTeam.crestPath ?? (match.awayTeam.isOwnClub ? CREST_PATH : null)),
  ]);
  const jpeg = await renderResultArt({
    format,
    siteName: SITE_NAME,
    competition,
    round: match.round,
    category: categoryLabel,
    outcome: resultOutcome(ownIsHome, homeScore, awayScore),
    home: { name: teamName(match.homeTeam), crest: homeCrest, score: homeScore },
    away: { name: teamName(match.awayTeam), crest: awayCrest, score: awayScore },
    scorers: formatScorers(scorers),
  });
  const caption =
    format === "FEED"
      ? resultCaption({ homeName: match.homeTeam.name, awayName: match.awayTeam.name, homeScore, awayScore, competition, scorers, hashtag: clubHashtag(SITE_NAME) })
      : null;
  return { jpeg, caption, name: `resultado-${match.id}-${format.toLowerCase()}.jpg` };
}

async function buildCall(match: FullMatch, ownClubId: string, now: Date): Promise<Built> {
  const { own, opponent } = sides(match, ownClubId);
  const [ownCrest, opponentCrest] = await Promise.all([imageDataUri(own.crestPath ?? CREST_PATH), imageDataUri(opponent.crestPath)]);
  const jpeg = await renderCallArt({
    siteName: SITE_NAME,
    headline: callHeadline(match.kickoffAt, now),
    ownCrest,
    opponent: { name: teamName(opponent), crest: opponentCrest },
    when: shortKickoff(match.kickoffAt),
    venue: match.venue,
    competition: [match.season.competition.name, match.round].filter(Boolean).join(" · ") || null,
  });
  return { jpeg, caption: null, name: `chamada-${match.id}.jpg` };
}

async function buildLineup(match: FullMatch, ownClubId: string): Promise<Built> {
  const { opponent } = sides(match, ownClubId);
  const starters = match.lineup.filter((item) => item.role === "STARTER").map((item) => item.athlete);
  // Só aparece o nome de quem tem divulgação autorizada; os demais entram na contagem.
  const visible = groupByPosition(starters.filter((athlete) => athlete.isPublished)).flatMap((group) => group.athletes);
  const shown = visible.slice(0, 11);
  const jpeg = await renderLineupArt({
    siteName: SITE_NAME,
    opponent: teamName(opponent),
    when: shortKickoff(match.kickoffAt),
    starters: shown.map((athlete) => ({ number: athlete.shirtNumber, name: displayName(athlete) })),
    hiddenStarters: starters.length - shown.length,
    substitutes: match.lineup
      .filter((item) => item.role === "SUBSTITUTE" && item.athlete.isPublished)
      .map((item) => displayName(item.athlete))
      .slice(0, 12),
  });
  return { jpeg, caption: null, name: `escalacao-${match.id}.jpg` };
}

const newsInclude = { category: true } satisfies Prisma.NewsArticleInclude;
type FullNews = Prisma.NewsArticleGetPayload<{ include: typeof newsInclude }>;

async function buildNews(article: FullNews): Promise<Built> {
  const cover = article.coverPath ? await imageDataUri(article.coverPath, 1080) : null;
  const jpeg = await renderNewsArt({ siteName: SITE_NAME, title: article.title, category: article.category?.name ?? null, cover });
  return {
    jpeg,
    caption: newsCaption({ title: article.title, summary: article.summary, url: `${SITE_URL}/noticias/${article.slug}`, hashtag: clubHashtag(SITE_NAME) }),
    name: `noticia-${article.id}.jpg`,
  };
}

async function loadCategoryLabels(): Promise<Record<string, string>> {
  return resolveCategoryLabels(await prisma.teamProfile.findMany({ select: { category: true, name: true } }));
}

// --- Execução -------------------------------------------------------------------------------------

export type AutomationRun = { created: { key: string; id: string }[]; failed: { key: string; error: string }[] };

/**
 * Chamado pelo agendador antes de publicar: cria as publicações das automações ligadas.
 * Cada publicação criada entra na fila como "Agendada" e pode ser editada ou cancelada no painel antes de sair.
 */
export async function runAutomations(now: Date = new Date()): Promise<AutomationRun> {
  const run: AutomationRun = { created: [], failed: [] };
  const automations = await listAutomations();
  if (!AUTOMATION_KINDS.some((kind) => automations[kind].enabled)) return run;

  const ownClub = await prisma.club.findFirst({ where: { isOwnClub: true }, select: { id: true } });
  const t = now.getTime();
  const T = AUTOMATION_TIMING;
  const [matches, news, existing] = await Promise.all([
    ownClub
      ? prisma.match.findMany({
          where: {
            OR: [{ homeTeamId: ownClub.id }, { awayTeamId: ownClub.id }],
            kickoffAt: { gte: new Date(t - T.resultLookback), lte: new Date(t + T.callAhead) },
          },
          select: { id: true, kickoffAt: true, status: true, homeScore: true, awayScore: true, updatedAt: true, _count: { select: { lineup: { where: { role: "STARTER" } } } } },
        })
      : Promise.resolve([]),
    prisma.newsArticle.findMany({
      where: { status: "PUBLISHED", publishedAt: { gte: new Date(t - T.newsLookback), lte: now } },
      select: { id: true, publishedAt: true, status: true },
    }),
    prisma.instagramPost.findMany({ where: { automationKey: { not: null } }, select: { automationKey: true } }),
  ]);

  const planned = planAutomationPosts({
    now,
    automations,
    matches: matches.map((match) => ({ ...match, starters: match._count.lineup })),
    news,
    existingKeys: new Set(existing.map((item) => item.automationKey!)),
  });
  if (planned.length === 0) return run;

  const categoryLabels = await loadCategoryLabels();
  const fullMatches = new Map<string, FullMatch>();
  const loadMatch = async (id: string) => {
    if (!fullMatches.has(id)) {
      const match = await prisma.match.findUnique({ where: { id }, include: matchInclude });
      if (match) fullMatches.set(id, match);
    }
    return fullMatches.get(id) ?? null;
  };

  for (const post of planned) {
    try {
      const built = await build(post, loadMatch, ownClub?.id ?? null, now, categoryLabels);
      if (!built) continue;
      const imagePath = await storeGeneratedImage(built.jpeg, built.name);
      const created = await prisma.$transaction(async (tx) => {
        const row = await tx.instagramPost.create({
          data: {
            format: post.format,
            imagePath,
            caption: built.caption,
            status: "SCHEDULED",
            origin: "AUTOMATION",
            scheduledAt: post.scheduledAt,
            automationKey: post.key,
            matchId: post.matchId ?? null,
            newsArticleId: post.newsArticleId ?? null,
          },
        });
        await audit(
          { userId: null, action: "instagram.automation", entity: "InstagramPost", entityId: row.id, summary: `Automação criou publicação (${post.key})`, after: { scheduledAt: post.scheduledAt.toISOString() } },
          tx,
        );
        return row;
      });
      run.created.push({ key: post.key, id: created.id });
    } catch (error) {
      // Outro disparo criou a mesma publicação ao mesmo tempo: a chave única impede a duplicata.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") continue;
      console.error(`[instagram] automação ${post.key} falhou`, error);
      run.failed.push({ key: post.key, error: error instanceof Error ? error.message : String(error) });
    }
  }
  return run;
}

async function build(
  post: PlannedPost,
  loadMatch: (id: string) => Promise<FullMatch | null>,
  ownClubId: string | null,
  now: Date,
  categoryLabels: Record<string, string>,
): Promise<Built | null> {
  if (post.kind === "NEWS_PUBLISHED") {
    if (!post.newsArticleId) return null;
    const article = await prisma.newsArticle.findUnique({ where: { id: post.newsArticleId }, include: newsInclude });
    return article && article.status === "PUBLISHED" ? buildNews(article) : null;
  }
  if (!post.matchId || !ownClubId) return null;
  const match = await loadMatch(post.matchId);
  if (!match) return null;
  if (post.kind === "MATCH_RESULT") return buildResult(match, ownClubId, post.format, categoryLabels[match.category] ?? null);
  if (post.kind === "MATCH_CALL") return buildCall(match, ownClubId, now);
  return buildLineup(match, ownClubId);
}

// --- Prévia (painel) ------------------------------------------------------------------------------

/**
 * Gera a arte de uma automação sem criar publicação, para conferir o visual no painel.
 * Usa o jogo encerrado mais recente (resultado), o próximo jogo (chamada e escalação) ou a última notícia publicada.
 * Devolve null quando não há dados para montar a arte.
 */
export async function previewArt(kind: AutomationKind, format: InstagramFormat): Promise<Buffer | null> {
  if (kind === "NEWS_PUBLISHED") {
    const article = await prisma.newsArticle.findFirst({ where: { status: "PUBLISHED" }, orderBy: { publishedAt: "desc" }, include: newsInclude });
    return article ? (await buildNews(article)).jpeg : null;
  }
  const ownClub = await prisma.club.findFirst({ where: { isOwnClub: true }, select: { id: true } });
  if (!ownClub) return null;
  const own = { OR: [{ homeTeamId: ownClub.id }, { awayTeamId: ownClub.id }] };
  const match =
    kind === "MATCH_RESULT"
      ? await prisma.match.findFirst({ where: { ...own, status: "FINISHED", homeScore: { not: null }, awayScore: { not: null } }, orderBy: { kickoffAt: "desc" }, include: matchInclude })
      : await prisma.match.findFirst({ where: { ...own, status: "SCHEDULED", kickoffAt: { gte: new Date() } }, orderBy: { kickoffAt: "asc" }, include: matchInclude });
  if (!match) return null;
  if (kind === "MATCH_RESULT") return (await buildResult(match, ownClub.id, format, (await loadCategoryLabels())[match.category] ?? null)).jpeg;
  if (kind === "MATCH_CALL") return (await buildCall(match, ownClub.id, new Date())).jpeg;
  return (await buildLineup(match, ownClub.id)).jpeg;
}
