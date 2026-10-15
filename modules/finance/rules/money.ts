// Dinheiro: valores sempre em centavos (inteiros), nunca em ponto flutuante.

export const MAX_AMOUNT_CENTS = 1_000_000_000; // R$ 10 milhões por lançamento

/**
 * Converte um valor digitado em reais para centavos. Aceita "50", "50,00", "1.234,56", "1234.56" e "R$ 50,00".
 * Devolve null para texto inválido, valor zero, negativo, com mais de duas casas ou acima do limite.
 */
export function parseMoney(raw: string): number | null {
  let text = raw.replace(/R\$/i, "").replace(/\s/g, "");
  if (text === "") return null;
  if (text.includes(",")) {
    text = text.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(text)) {
    text = text.replace(/\./g, "");
  }
  const match = /^(\d{1,9})(?:\.(\d{1,2}))?$/.exec(text);
  if (!match) return null;
  const cents = Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
  if (!Number.isSafeInteger(cents) || cents <= 0 || cents > MAX_AMOUNT_CENTS) return null;
  return cents;
}

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** Formata centavos como moeda brasileira, com espaços comuns (sem espaço inseparável). */
export function formatMoney(cents: number): string {
  return brl.format(cents / 100).replace(/ | /g, " ");
}

/** Centavos no formato de um campo de formulário: 123456 → "1234,56". */
export function centsToInput(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const absolute = Math.abs(cents);
  return `${sign}${Math.floor(absolute / 100)},${String(absolute % 100).padStart(2, "0")}`;
}
