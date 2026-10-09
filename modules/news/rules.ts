// Regras de notícias. Módulo puro.

export const NEWS_STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;
export type NewsStatus = (typeof NEWS_STATUSES)[number];

export const NEWS_STATUS_LABELS: Record<NewsStatus, string> = {
  DRAFT: "Rascunho",
  PUBLISHED: "Publicada",
  ARCHIVED: "Arquivada",
};

/** Uma notícia aparece no portal somente se estiver publicada e a data de publicação já tiver chegado. */
export function isPubliclyVisible(article: { status: string; publishedAt: Date | null }, now: Date = new Date()): boolean {
  return article.status === "PUBLISHED" && article.publishedAt !== null && article.publishedAt.getTime() <= now.getTime();
}

/** Rótulo do estado para o painel, distinguindo publicações agendadas. */
export function publicationLabel(article: { status: NewsStatus; publishedAt: Date | null }, now: Date = new Date()): string {
  if (article.status === "PUBLISHED" && article.publishedAt && article.publishedAt.getTime() > now.getTime()) {
    return "Agendada";
  }
  return NEWS_STATUS_LABELS[article.status];
}

/**
 * Define a data de publicação conforme o estado:
 * - rascunho: sem data;
 * - publicada: data informada (pode ser futura = agendamento), senão a anterior, senão agora;
 * - arquivada: mantém a data anterior, para preservar o histórico.
 */
export function resolvePublishedAt(
  status: NewsStatus,
  requested: Date | null,
  previous: Date | null,
  now: Date = new Date(),
): Date | null {
  if (status === "DRAFT") return null;
  if (status === "ARCHIVED") return previous;
  return requested ?? previous ?? now;
}

export type ContentBlock = { type: "heading" | "paragraph"; text: string };

/**
 * O conteúdo é texto puro: parágrafos separados por linha em branco e subtítulos iniciados por "## ".
 * Nenhum HTML é interpretado, o que elimina o risco de XSS no conteúdo editorial.
 */
export function parseContent(content: string): ContentBlock[] {
  return content
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length > 0)
    .map((chunk): ContentBlock => {
      if (chunk.startsWith("## ")) return { type: "heading", text: chunk.slice(3).trim() };
      return { type: "paragraph", text: chunk };
    });
}
