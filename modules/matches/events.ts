// Lances e escalação de partidas. Módulo puro.

export const EVENT_TYPES = ["GOAL", "PENALTY_GOAL", "OWN_GOAL", "YELLOW_CARD", "RED_CARD", "SUBSTITUTION"] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  GOAL: "Gol",
  PENALTY_GOAL: "Gol de pênalti",
  OWN_GOAL: "Gol contra",
  YELLOW_CARD: "Cartão amarelo",
  RED_CARD: "Cartão vermelho",
  SUBSTITUTION: "Substituição",
};

export const LINEUP_ROLES = ["STARTER", "SUBSTITUTE"] as const;
export type LineupRole = (typeof LINEUP_ROLES)[number];

export const LINEUP_ROLE_LABELS: Record<LineupRole, string> = { STARTER: "Titulares", SUBSTITUTE: "Reservas" };

export const MAX_STARTERS = 11;

type EventLike = { type: string; clubId: string; minute: number | null };

const GOAL_TYPES: readonly string[] = ["GOAL", "PENALTY_GOAL", "OWN_GOAL"];

/**
 * Soma os gols registrados nos lances para cada lado.
 * `clubId` é sempre o time do jogador: um gol contra conta para o adversário.
 */
export function tallyGoals(events: readonly EventLike[], homeTeamId: string, awayTeamId: string): { home: number; away: number } {
  let home = 0;
  let away = 0;
  for (const event of events) {
    if (!GOAL_TYPES.includes(event.type)) continue;
    const byHome = event.clubId === homeTeamId;
    const byAway = event.clubId === awayTeamId;
    if (!byHome && !byAway) continue;
    const scoresForHome = event.type === "OWN_GOAL" ? byAway : byHome;
    if (scoresForHome) home += 1;
    else away += 1;
  }
  return { home, away };
}

/**
 * Compara os gols dos lances com o placar oficial. Devolve um aviso, ou null se estiver coerente.
 * Só compara quando há algum gol lançado: registrar os lances é opcional.
 */
export function goalsMismatch(
  events: readonly EventLike[],
  match: { homeTeamId: string; awayTeamId: string; homeScore: number | null; awayScore: number | null },
): string | null {
  const tally = tallyGoals(events, match.homeTeamId, match.awayTeamId);
  if (tally.home + tally.away === 0) return null;
  if (match.homeScore === null || match.awayScore === null) {
    return `Há ${tally.home + tally.away} gol(s) nos lances, mas a partida está sem placar.`;
  }
  if (tally.home !== match.homeScore || tally.away !== match.awayScore) {
    return `Os lances somam ${tally.home} x ${tally.away}, mas o placar registrado é ${match.homeScore} x ${match.awayScore}. O placar oficial é o da partida.`;
  }
  return null;
}

/** Ordena os lances por minuto; os sem minuto ficam no fim, na ordem de cadastro. */
export function sortEvents<T extends { minute: number | null; createdAt: Date }>(events: readonly T[]): T[] {
  return [...events].sort(
    (a, b) => (a.minute ?? Number.MAX_SAFE_INTEGER) - (b.minute ?? Number.MAX_SAFE_INTEGER) || a.createdAt.getTime() - b.createdAt.getTime(),
  );
}

export function formatMinute(minute: number | null): string {
  return minute === null ? "—" : `${minute}'`;
}

export type LineupEntry = { athleteId: string; role: LineupRole };

/** Valida a escalação: no máximo 11 titulares, sem jogador repetido e só atletas conhecidos. */
export function validateLineup(entries: readonly LineupEntry[], knownAthleteIds: readonly string[]): string | null {
  const seen = new Set<string>();
  for (const entry of entries) {
    if (!knownAthleteIds.includes(entry.athleteId)) return "A escalação contém um jogador que não está no elenco.";
    if (seen.has(entry.athleteId)) return "Um jogador aparece mais de uma vez na escalação.";
    seen.add(entry.athleteId);
  }
  const starters = entries.filter((entry) => entry.role === "STARTER").length;
  if (starters > MAX_STARTERS) return `A escalação tem ${starters} titulares; o máximo é ${MAX_STARTERS}.`;
  return null;
}
