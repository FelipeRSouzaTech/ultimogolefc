// Galeria. Módulo puro.

export const GALLERY_CATEGORIES = ["MATCH", "EVENT", "BACKSTAGE", "FANS", "SOCIAL"] as const;
export type GalleryCategory = (typeof GALLERY_CATEGORIES)[number];

export const GALLERY_CATEGORY_LABELS: Record<GalleryCategory, string> = {
  MATCH: "Partidas",
  EVENT: "Eventos",
  BACKSTAGE: "Bastidores",
  FANS: "Torcida",
  SOCIAL: "Ações sociais",
};

export function isGalleryCategory(value: unknown): value is GalleryCategory {
  return typeof value === "string" && (GALLERY_CATEGORIES as readonly string[]).includes(value);
}

/** Índice vizinho em uma lista circular: depois da última imagem vem a primeira, e vice-versa. */
export function neighborIndex(current: number, total: number, step: 1 | -1): number {
  if (total <= 0) return 0;
  return (((current + step) % total) + total) % total;
}

/** Próxima posição ao acrescentar uma imagem no fim do álbum. */
export function nextSortOrder(existing: readonly number[]): number {
  return existing.length === 0 ? 0 : Math.max(...existing) + 1;
}
