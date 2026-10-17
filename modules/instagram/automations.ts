// Automações do Instagram: decide O QUE publicar e QUANDO a partir dos dados do clube.
// Módulo puro: sem banco, sem rede. Quem busca os dados e grava as publicações é automation-service.ts.

import { formatTime, formatWeekday, utcToSaoPauloLocal } from "@/lib/datetime";
import type { InstagramFormat } from "./rules";

export const AUTOMATION_KINDS = ["MATCH_RESULT", "MATCH_CALL", "MATCH_LINEUP", "NEWS_PUBLISHED"] as const;
export type AutomationKind = (typeof AUTOMATION_KINDS)[number];

export const AUTOMATION_INFO: Record<AutomationKind, { name: string; description: string }> = {
  MATCH_RESULT: { name: "Resultado do jogo", description: "Feed e story com o placar, 30 min depois que o jogo for encerrado no painel." },
  MATCH_CALL: { name: "Chamada do jogo", description: "Story com adversário, dia, horário e local, 24 h antes do jogo." },
  MATCH_LINEUP: { name: "Escalação", description: "Story com os titulares, 2 h antes do jogo. Só sai se a escalação estiver salva no jogo." },
  NEWS_PUBLISHED: { name: "Notícia publicada no site", description: "Feed com a capa e o título, 10 min depois que a notícia for publicada." },
};

export function isAutomationKind(value: unknown): value is AutomationKind {
  return typeof value === "string" && (AUTOMATION_KINDS as readonly string[]).includes(value);
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

/** Janelas e atrasos de cada automação. */
export const AUTOMATION_TIMING = {
  resultDelay: 30 * MINUTE,
  resultLookback: 3 * 24 * HOUR,
  callAhead: 24 * HOUR,
  callMinLead: 2 * HOUR,
  lineupAhead: 2 * HOUR,
  lineupWindow: 3 * HOUR,
  lineupMinLead: 40 * MINUTE,
  newsDelay: 10 * MINUTE,
  newsLookback: 24 * HOUR,
  minDelay: 5 * MINUTE,
} as const;

export type AutomationState = { enabled: boolean; enabledAt: Date | null };

export type MatchFact = {
  id: string;
  kickoffAt: Date;
  status: "SCHEDULED" | "LIVE" | "FINISHED" | "POSTPONED" | "CANCELLED";
  homeScore: number | null;
  awayScore: number | null;
  updatedAt: Date;
  starters: number;
};

export type NewsFact = { id: string; publishedAt: Date | null; status: "DRAFT" | "PUBLISHED" | "ARCHIVED" };

export type PlannedPost = {
  key: string;
  kind: AutomationKind;
  format: InstagramFormat;
  scheduledAt: Date;
  matchId?: string;
  newsArticleId?: string;
};

export function automationKey(kind: AutomationKind, refId: string, format: InstagramFormat): string {
  const prefix = { MATCH_RESULT: "resultado", MATCH_CALL: "chamada", MATCH_LINEUP: "escalacao", NEWS_PUBLISHED: "noticia" }[kind];
  return `${prefix}:${refId}:${format}`;
}

function later(a: number, b: number): Date {
  return new Date(Math.max(a, b));
}

/**
 * Lista as publicações que as automações ligadas devem criar agora.
 * Nada é gerado para o que aconteceu antes de a automação ser ligada, nem duas vezes para a mesma chave.
 */
export function planAutomationPosts(input: {
  now: Date;
  automations: Partial<Record<AutomationKind, AutomationState>>;
  matches: MatchFact[];
  news: NewsFact[];
  existingKeys: ReadonlySet<string>;
}): PlannedPost[] {
  const { now, automations, existingKeys } = input;
  const t = now.getTime();
  const T = AUTOMATION_TIMING;
  const planned: PlannedPost[] = [];
  const add = (post: PlannedPost) => {
    if (!existingKeys.has(post.key) && !planned.some((item) => item.key === post.key)) planned.push(post);
  };
  const on = (kind: AutomationKind) => {
    const state = automations[kind];
    return state?.enabled ? (state.enabledAt?.getTime() ?? 0) : null;
  };

  const resultSince = on("MATCH_RESULT");
  const callSince = on("MATCH_CALL");
  const lineupSince = on("MATCH_LINEUP");
  const newsSince = on("NEWS_PUBLISHED");

  for (const match of input.matches) {
    const kickoff = match.kickoffAt.getTime();
    const lead = kickoff - t;

    if (
      resultSince !== null &&
      match.status === "FINISHED" &&
      match.homeScore !== null &&
      match.awayScore !== null &&
      kickoff <= t &&
      t - kickoff <= T.resultLookback &&
      match.updatedAt.getTime() >= resultSince
    ) {
      for (const format of ["FEED", "STORY"] as const) {
        add({ key: automationKey("MATCH_RESULT", match.id, format), kind: "MATCH_RESULT", format, scheduledAt: new Date(t + T.resultDelay), matchId: match.id });
      }
    }

    if (callSince !== null && match.status === "SCHEDULED" && lead >= T.callMinLead && lead <= T.callAhead) {
      add({
        key: automationKey("MATCH_CALL", match.id, "STORY"),
        kind: "MATCH_CALL",
        format: "STORY",
        scheduledAt: later(t + T.minDelay, kickoff - T.callAhead),
        matchId: match.id,
      });
    }

    if (lineupSince !== null && match.status === "SCHEDULED" && match.starters > 0 && lead >= T.lineupMinLead && lead <= T.lineupWindow) {
      add({
        key: automationKey("MATCH_LINEUP", match.id, "STORY"),
        kind: "MATCH_LINEUP",
        format: "STORY",
        scheduledAt: later(t + T.minDelay, kickoff - T.lineupAhead),
        matchId: match.id,
      });
    }
  }

  if (newsSince !== null) {
    for (const article of input.news) {
      const published = article.publishedAt?.getTime();
      if (article.status !== "PUBLISHED" || published === undefined) continue;
      if (published > t || t - published > T.newsLookback || published < newsSince) continue;
      add({
        key: automationKey("NEWS_PUBLISHED", article.id, "FEED"),
        kind: "NEWS_PUBLISHED",
        format: "FEED",
        scheduledAt: new Date(Math.max(t + T.minDelay, published + T.newsDelay)),
        newsArticleId: article.id,
      });
    }
  }

  return planned.sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
}

// --- Textos ---------------------------------------------------------------------------------------

/** "#UltimoGoleFC" a partir do nome do clube. */
export function clubHashtag(name: string): string {
  const clean = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => (word === word.toUpperCase() ? word : word[0]!.toUpperCase() + word.slice(1)))
    .join("");
  return clean ? `#${clean}` : "";
}

export type ScorerLine = { name: string; goals: number };

/** "Rafa 2, Dudu" */
export function formatScorers(scorers: ScorerLine[]): string {
  return scorers.map((s) => (s.goals > 1 ? `${s.name} ${s.goals}` : s.name)).join(", ");
}

/** Agrupa os gols por jogador, na ordem em que aconteceram. */
export function countScorers(names: (string | null)[]): ScorerLine[] {
  const lines: ScorerLine[] = [];
  for (const name of names) {
    if (!name) continue;
    const line = lines.find((item) => item.name === name);
    if (line) line.goals += 1;
    else lines.push({ name, goals: 1 });
  }
  return lines;
}

export type ResultOutcome = "Vitória" | "Empate" | "Derrota";

export function resultOutcome(ownIsHome: boolean, homeScore: number, awayScore: number): ResultOutcome {
  const own = ownIsHome ? homeScore : awayScore;
  const other = ownIsHome ? awayScore : homeScore;
  return own > other ? "Vitória" : own === other ? "Empate" : "Derrota";
}

export function resultCaption(input: {
  homeName: string;
  awayName: string;
  homeScore: number;
  awayScore: number;
  competition: string | null;
  scorers: ScorerLine[];
  hashtag: string;
}): string {
  const lines = [`Fim de jogo: ${input.homeName} ${input.homeScore} × ${input.awayScore} ${input.awayName}.`];
  if (input.competition) lines.push(input.competition);
  if (input.scorers.length > 0) lines.push(`Gols: ${formatScorers(input.scorers)}.`);
  if (input.hashtag) lines.push("", input.hashtag);
  return lines.join("\n");
}

export function newsCaption(input: { title: string; summary: string; url: string; hashtag: string }): string {
  return [input.title, "", input.summary, "", `Leia a notícia completa no site: ${input.url}`, input.hashtag ? `\n${input.hashtag}` : ""]
    .join("\n")
    .trim();
}

/** "Hoje tem jogo" / "Amanhã tem jogo" / "Sábado tem jogo", conforme o dia em São Paulo. */
export function callHeadline(kickoffAt: Date, now: Date): string {
  const day = (d: Date) => utcToSaoPauloLocal(d).slice(0, 10);
  if (day(kickoffAt) === day(now)) return "Hoje tem jogo";
  if (day(kickoffAt) === day(new Date(now.getTime() + 24 * HOUR))) return "Amanhã tem jogo";
  const weekday = formatWeekday(kickoffAt);
  return `${weekday[0]!.toUpperCase()}${weekday.slice(1)} tem jogo`;
}

/** "sáb 18/10 · 9h" (horário de São Paulo; minutos só quando não forem zero). */
export function shortKickoff(kickoffAt: Date): string {
  const local = utcToSaoPauloLocal(kickoffAt);
  const [, month, day] = local.slice(0, 10).split("-");
  const [hour, minute] = formatTime(kickoffAt).split(":");
  const weekday = formatWeekday(kickoffAt).slice(0, 3);
  return `${weekday} ${day}/${month} · ${Number(hour)}h${minute === "00" ? "" : minute}`;
}
