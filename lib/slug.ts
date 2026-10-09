/** Converte um texto em slug amigável para URL (sem acentos, minúsculo, com hífens). */
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96)
    .replace(/-+$/g, "");
}

/** Gera um slug único consultando `exists`; acrescenta -2, -3… quando necessário. */
export async function uniqueSlug(base: string, exists: (slug: string) => Promise<boolean>): Promise<string> {
  const root = slugify(base) || "item";
  let candidate = root;
  for (let n = 2; await exists(candidate); n += 1) {
    candidate = `${root}-${n}`;
  }
  return candidate;
}
