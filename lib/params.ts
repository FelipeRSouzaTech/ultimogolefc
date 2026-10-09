export type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** Lê um parâmetro de busca como texto simples e limitado; ignora valores repetidos. */
export function param(params: Record<string, string | string[] | undefined>, name: string, max = 100): string | undefined {
  const value = params[name];
  const text = Array.isArray(value) ? value[0] : value;
  const trimmed = text?.trim().slice(0, max);
  return trimmed ? trimmed : undefined;
}
