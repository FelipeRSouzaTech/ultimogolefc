// Regras de mídia. Módulo puro: valida o arquivo pelo conteúdo real (bytes), não só pelo nome.

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MEDIA_PREFIX = "/midia/";

export const IMAGE_TYPES = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
} as const;
export type ImageMime = keyof typeof IMAGE_TYPES;

const EXTENSIONS: Record<string, ImageMime> = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp" };

function startsWith(bytes: Uint8Array, signature: readonly number[], offset = 0): boolean {
  return signature.every((value, index) => bytes[offset + index] === value);
}

/** Identifica o tipo real pelos bytes iniciais do arquivo. Devolve null se não for PNG, JPEG ou WebP. */
export function detectImageType(bytes: Uint8Array): ImageMime | null {
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)) return "image/webp";
  return null;
}

export type ImageInspection = { ok: true; mime: ImageMime; extension: string } | { ok: false; error: string };

/**
 * Valida tamanho, extensão e tipo real de uma imagem enviada.
 * SVG e GIF não são aceitos: SVG pode conter scripts e seria servido no mesmo domínio do painel.
 */
export function inspectImage(bytes: Uint8Array, fileName: string): ImageInspection {
  if (bytes.length === 0) return { ok: false, error: "O arquivo está vazio." };
  if (bytes.length > MAX_IMAGE_BYTES) return { ok: false, error: "A imagem deve ter no máximo 5 MB." };

  const extension = fileName.includes(".") ? (fileName.split(".").pop() ?? "").toLowerCase() : "";
  const declared = EXTENSIONS[extension];
  if (!declared) return { ok: false, error: "Formato não aceito. Envie uma imagem PNG, JPG ou WebP." };

  const actual = detectImageType(bytes);
  if (!actual) return { ok: false, error: "O arquivo não é uma imagem PNG, JPG ou WebP válida." };
  if (actual !== declared) return { ok: false, error: "A extensão do arquivo não corresponde ao seu conteúdo." };

  return { ok: true, mime: actual, extension: IMAGE_TYPES[actual] };
}

const KEY_PATTERN = /^\d{4}\/\d{2}\/[a-f0-9]{24}\.(png|jpg|webp)$/;

/** Chaves de armazenamento são geradas pelo sistema; qualquer outro formato é recusado (impede "../" e afins). */
export function isValidKey(key: string): boolean {
  return KEY_PATTERN.test(key);
}

export function buildKey(randomHex: string, extension: string, now: Date = new Date()): string {
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${year}/${month}/${randomHex}.${extension}`;
}

export function keyToPath(key: string): string {
  return `${MEDIA_PREFIX}${key}`;
}

/** Devolve a chave de um caminho "/midia/..." válido, ou null para qualquer outro caminho. */
export function pathToKey(path: string | null | undefined): string | null {
  if (!path || !path.startsWith(MEDIA_PREFIX)) return null;
  const key = path.slice(MEDIA_PREFIX.length);
  return isValidKey(key) ? key : null;
}

export function isUploadedPath(path: string | null | undefined): boolean {
  return pathToKey(path) !== null;
}

export function mimeFromKey(key: string): ImageMime | null {
  const extension = key.split(".").pop() ?? "";
  return EXTENSIONS[extension] ?? null;
}
