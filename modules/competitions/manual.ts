// Classificação manual. Módulo puro.

export type ManualRow = {
  clubId: string;
  position: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
};

export const MANUAL_FIELDS = ["position", "played", "wins", "draws", "losses", "goalsFor", "goalsAgainst", "points"] as const;
export type ManualField = (typeof MANUAL_FIELDS)[number];

export const MANUAL_FIELD_LABELS: Record<ManualField, string> = {
  position: "Pos",
  played: "J",
  wins: "V",
  draws: "E",
  losses: "D",
  goalsFor: "GP",
  goalsAgainst: "GC",
  points: "Pts",
};

/** Lê um inteiro não negativo de um campo de formulário. Vazio vira 0; qualquer outra coisa, null. */
export function parseCount(raw: string): number | null {
  const value = raw.trim();
  if (value === "") return 0;
  if (!/^\d{1,4}$/.test(value)) return null;
  return Number(value);
}

/**
 * Valida a tabela digitada: uma linha por participante, posições de 1 a N sem repetição
 * e jogos = vitórias + empates + derrotas. Devolve as mensagens de erro (vazio = válida).
 */
export function validateManualTable(rows: readonly ManualRow[], participantIds: readonly string[], names: Readonly<Record<string, string>> = {}): string[] {
  const errors: string[] = [];
  const label = (clubId: string) => names[clubId] ?? clubId;

  const rowIds = rows.map((row) => row.clubId);
  for (const clubId of participantIds) {
    if (!rowIds.includes(clubId)) errors.push(`Falta a linha de ${label(clubId)}.`);
  }
  for (const clubId of rowIds) {
    if (!participantIds.includes(clubId)) errors.push(`${label(clubId)} não participa desta temporada.`);
  }
  if (new Set(rowIds).size !== rowIds.length) errors.push("Há clube repetido na tabela.");

  const positions = rows.map((row) => row.position).sort((a, b) => a - b);
  const expected = rows.map((_, index) => index + 1);
  if (positions.some((position, index) => position !== expected[index])) {
    errors.push(`As posições devem ir de 1 a ${rows.length}, sem repetição.`);
  }

  for (const row of rows) {
    if (row.played !== row.wins + row.draws + row.losses) {
      errors.push(`${label(row.clubId)}: os jogos (${row.played}) devem ser a soma de vitórias, empates e derrotas (${row.wins + row.draws + row.losses}).`);
    }
  }
  return errors;
}
