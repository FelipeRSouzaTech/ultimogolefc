// Regras das publicações no Instagram. Módulo puro: sem banco, sem rede e sem variáveis de ambiente.

import { utcToSaoPauloLocal } from "@/lib/datetime";
import { MEDIA_PREFIX } from "@/modules/media/rules";

export const INSTAGRAM_FORMATS = ["FEED", "STORY"] as const;
export type InstagramFormat = (typeof INSTAGRAM_FORMATS)[number];

export const INSTAGRAM_FORMAT_LABELS: Record<InstagramFormat, string> = {
  FEED: "Feed",
  STORY: "Story",
};

/** Tamanho recomendado de cada formato, mostrado no formulário. */
export const INSTAGRAM_FORMAT_SIZES: Record<InstagramFormat, string> = {
  FEED: "1080 × 1350 px (4:5) ou 1080 × 1080 px (1:1)",
  STORY: "1080 × 1920 px (9:16)",
};

export const INSTAGRAM_STATUSES = ["DRAFT", "SCHEDULED", "PUBLISHING", "PUBLISHED", "FAILED", "CANCELED"] as const;
export type InstagramPostStatus = (typeof INSTAGRAM_STATUSES)[number];

export const INSTAGRAM_STATUS_LABELS: Record<InstagramPostStatus, string> = {
  DRAFT: "Rascunho",
  SCHEDULED: "Agendada",
  PUBLISHING: "Publicando",
  PUBLISHED: "Publicada",
  FAILED: "Falhou",
  CANCELED: "Cancelada",
};

export const INSTAGRAM_ORIGIN_LABELS = { MANUAL: "Manual", AUTOMATION: "Automação" } as const;

/** O que fazer ao salvar o formulário. */
export const INSTAGRAM_WHEN = ["NOW", "SCHEDULE", "DRAFT"] as const;
export type InstagramWhen = (typeof INSTAGRAM_WHEN)[number];

export const CAPTION_MAX_CHARS = 2200;
export const CAPTION_MAX_HASHTAGS = 30;
/** Tentativas automáticas do agendador antes de marcar a publicação como "Falhou". */
export const MAX_ATTEMPTS = 3;
/** Uma publicação presa em "Publicando" por mais tempo que isso pode ser retomada pelo agendador. */
export const LOCK_TIMEOUT_MS = 10 * 60 * 1000;
/** Postagens processadas por disparo do agendador (cada uma leva alguns segundos). */
export const RUN_BATCH_SIZE = 5;

export function isInstagramFormat(value: unknown): value is InstagramFormat {
  return typeof value === "string" && (INSTAGRAM_FORMATS as readonly string[]).includes(value);
}

export function countHashtags(caption: string): number {
  return caption.match(/(^|\s)#[^\s#]+/gu)?.length ?? 0;
}

/** Valida a legenda de acordo com o formato. Devolve a mensagem de erro, ou null se estiver tudo certo. */
export function captionError(format: InstagramFormat, caption: string | null): string | null {
  const text = caption ?? "";
  if (format === "STORY") return text.trim() === "" ? null : "Stories publicados pela API não levam legenda. Coloque o texto na própria imagem.";
  if (text.length > CAPTION_MAX_CHARS) return `A legenda pode ter até ${CAPTION_MAX_CHARS.toLocaleString("pt-BR")} caracteres.`;
  if (countHashtags(text) > CAPTION_MAX_HASHTAGS) return `Use no máximo ${CAPTION_MAX_HASHTAGS} hashtags.`;
  return null;
}

/** A API do Instagram só publica imagens JPEG. */
export function isJpegPath(path: string): boolean {
  return /\.(jpg|jpeg)$/i.test(path);
}

/** Estados em que a publicação ainda pode ser editada pelo painel. */
export function isEditable(status: InstagramPostStatus): boolean {
  return status === "DRAFT" || status === "SCHEDULED" || status === "FAILED" || status === "CANCELED";
}

/** Estados que podem ser excluídos (o que já saiu no Instagram fica no histórico). */
export function isDeletable(status: InstagramPostStatus): boolean {
  return status === "DRAFT" || status === "FAILED" || status === "CANCELED";
}

/** Situação inicial ao salvar, conforme a escolha "quando publicar". */
export function initialStatus(when: InstagramWhen): InstagramPostStatus {
  return when === "DRAFT" ? "DRAFT" : "SCHEDULED";
}

/** Um agendamento precisa estar no futuro (com 1 minuto de tolerância para o tempo de preencher o formulário). */
export function scheduleError(scheduledAt: Date | null, now: Date = new Date()): string | null {
  if (!scheduledAt) return "Informe data e horário.";
  if (scheduledAt.getTime() < now.getTime() - 60_000) return "Escolha um horário no futuro.";
  return null;
}

/** A publicação está pronta para o agendador? */
export function isDue(post: { status: InstagramPostStatus; scheduledAt: Date | null; lockedAt: Date | null }, now: Date = new Date()): boolean {
  if (post.status === "PUBLISHING") return post.lockedAt !== null && now.getTime() - post.lockedAt.getTime() > LOCK_TIMEOUT_MS;
  return post.status === "SCHEDULED" && post.scheduledAt !== null && post.scheduledAt.getTime() <= now.getTime();
}

/** Depois de uma falha: tenta de novo no próximo disparo, ou desiste. Erros permanentes (ex.: token) não repetem. */
export function statusAfterFailure(attempts: number, retryable: boolean): InstagramPostStatus {
  return retryable && attempts < MAX_ATTEMPTS ? "SCHEDULED" : "FAILED";
}

/**
 * Endereço público da imagem, que os servidores do Instagram vão baixar.
 * Com o armazenamento S3 usa o endereço do bucket; senão, o endereço do portal. Precisa ser HTTPS
 * e acessível pela internet (localhost não funciona: ver docs/INSTAGRAM.md).
 */
export function publicImageUrl(imagePath: string, siteUrl: string, s3PublicBase: string | null): string | null {
  if (/^https:\/\//.test(imagePath)) return imagePath;
  if (!imagePath.startsWith("/")) return null;
  const key = imagePath.startsWith(MEDIA_PREFIX) ? imagePath.slice(MEDIA_PREFIX.length) : null;
  const url = key && s3PublicBase ? `${s3PublicBase.replace(/\/$/, "")}/${key}` : `${siteUrl.replace(/\/$/, "")}${imagePath}`;
  if (!url.startsWith("https://")) return null;
  if (/^https:\/\/(localhost|127\.|0\.0\.0\.0|\[::1\])/i.test(url)) return null;
  return url;
}

export type GraphErrorInfo = { message: string; retryable: boolean };

/** Traduz um erro da Graph API para uma mensagem útil no painel. */
export function describeGraphError(error: { code?: number; error_subcode?: number; message?: string } | null | undefined): GraphErrorInfo {
  const code = error?.code;
  const sub = error?.error_subcode;
  if (code === 190 || code === 102) {
    return { message: "O token da conta do Instagram é inválido ou expirou. Gere um novo token e atualize a variável INSTAGRAM_ACCESS_TOKEN.", retryable: false };
  }
  if (code === 10 || (code !== undefined && code >= 200 && code < 300)) {
    return { message: "O app não tem permissão para publicar nesta conta. Confira as permissões do token (publicação de conteúdo).", retryable: false };
  }
  if (code === 4 || code === 17 || code === 32 || code === 613 || sub === 2207042) {
    return { message: "Limite de publicações ou de chamadas do Instagram atingido. A publicação será tentada de novo mais tarde.", retryable: true };
  }
  if (code === 36003 || sub === 2207009) {
    return { message: "Proporção da imagem não aceita. No feed use entre 4:5 e 1,91:1; no story, 9:16.", retryable: false };
  }
  if (code === 9004 || sub === 2207052 || sub === 2207083) {
    return { message: "O Instagram não conseguiu baixar a imagem. Confira se o endereço dela é público (HTTPS) e se o arquivo é JPEG.", retryable: false };
  }
  if (code === 1 || code === 2 || sub === 2207001) {
    return { message: "Instabilidade temporária no Instagram. A publicação será tentada de novo.", retryable: true };
  }
  const detail = error?.message ? ` Detalhe: ${error.message.slice(0, 200)}` : "";
  return { message: `O Instagram recusou a publicação.${detail}`, retryable: false };
}

// --- Agenda semanal ------------------------------------------------------------------------------

const WEEKDAY_SHORT = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"] as const;

export type WeekDay = { key: string; weekday: string; day: number; month: number };

/** "AAAA-MM-DD" (data em São Paulo) de um instante. */
export function saoPauloDateKey(date: Date): string {
  return utcToSaoPauloLocal(date).slice(0, 10);
}

function parseDateKey(key: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!m) return null;
  const time = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return isoDay(time) === key ? time : null;
}

/** "AAAA-MM-DD" de um dia representado à meia-noite UTC (só aritmética de calendário). */
function isoDay(time: number): string {
  return new Date(time).toISOString().slice(0, 10);
}

/** Segunda-feira ("AAAA-MM-DD") da semana que contém a data informada. Data inválida → semana de `now`. */
export function weekStartKey(reference: string | null | undefined, now: Date = new Date()): string {
  const parsed = reference ? parseDateKey(reference) : null;
  const base = parsed ?? parseDateKey(saoPauloDateKey(now))!;
  const weekday = (new Date(base).getUTCDay() + 6) % 7; // 0 = segunda
  return isoDay(base - weekday * 86_400_000);
}

export function shiftWeek(startKey: string, weeks: number): string {
  const base = parseDateKey(startKey) ?? parseDateKey(weekStartKey(null))!;
  return isoDay(base + weeks * 7 * 86_400_000);
}

export function weekDays(startKey: string): WeekDay[] {
  const base = parseDateKey(startKey) ?? parseDateKey(weekStartKey(null))!;
  return WEEKDAY_SHORT.map((weekday, index) => {
    const date = new Date(base + index * 86_400_000);
    return { key: isoDay(date.getTime()), weekday, day: date.getUTCDate(), month: date.getUTCMonth() + 1 };
  });
}

/** Data de referência de uma publicação na agenda: quando saiu, senão quando está marcada. */
export function agendaDate(post: { publishedAt: Date | null; scheduledAt: Date | null }): Date | null {
  return post.publishedAt ?? post.scheduledAt;
}

/** Agrupa publicações por dia (chave "AAAA-MM-DD" em São Paulo). */
export function groupByDay<T extends { publishedAt: Date | null; scheduledAt: Date | null }>(posts: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const post of posts) {
    const date = agendaDate(post);
    if (!date) continue;
    const key = saoPauloDateKey(date);
    const list = map.get(key);
    if (list) list.push(post);
    else map.set(key, [post]);
  }
  for (const list of map.values()) list.sort((a, b) => agendaDate(a)!.getTime() - agendaDate(b)!.getTime());
  return map;
}
