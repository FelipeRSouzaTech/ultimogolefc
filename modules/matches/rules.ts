// Regras de partidas. Módulo puro.

export const MATCH_STATUSES = ["SCHEDULED", "LIVE", "FINISHED", "POSTPONED", "CANCELLED"] as const;
export type MatchStatus = (typeof MATCH_STATUSES)[number];

export const MATCH_STATUS_LABELS: Record<MatchStatus, string> = {
  SCHEDULED: "Agendada",
  LIVE: "Em andamento",
  FINISHED: "Encerrada",
  POSTPONED: "Adiada",
  CANCELLED: "Cancelada",
};

export type MatchInput = {
  homeTeamId: string;
  awayTeamId: string;
  kickoffAt: Date;
  status: MatchStatus;
  homeScore: number | null;
  awayScore: number | null;
};

export type MatchValidation =
  | { ok: true; value: MatchInput }
  | { ok: false; errors: Record<string, string[]> };

const validScore = (score: number | null): score is number => score !== null && Number.isInteger(score) && score >= 0 && score <= 99;

/**
 * Valida uma partida contra os participantes da temporada e normaliza o placar:
 * - mandante e visitante devem ser diferentes e participar da temporada;
 * - partida encerrada exige placar completo e não pode estar no futuro;
 * - partidas agendadas, adiadas ou canceladas não guardam placar.
 */
export function validateMatch(input: MatchInput, participantIds: readonly string[], now: Date = new Date()): MatchValidation {
  const errors: Record<string, string[]> = {};
  const add = (key: string, message: string) => (errors[key] ??= []).push(message);

  if (input.homeTeamId === input.awayTeamId) {
    add("awayTeamId", "Mandante e visitante devem ser equipes diferentes.");
  }
  if (!participantIds.includes(input.homeTeamId)) {
    add("homeTeamId", "O mandante não participa desta temporada.");
  }
  if (!participantIds.includes(input.awayTeamId)) {
    add("awayTeamId", "O visitante não participa desta temporada.");
  }
  if (Number.isNaN(input.kickoffAt.getTime())) {
    add("kickoffAt", "Informe data e horário válidos.");
  }

  let { homeScore, awayScore } = input;

  if (input.status === "FINISHED") {
    if (!validScore(homeScore)) add("homeScore", "Informe os gols do mandante para encerrar a partida.");
    if (!validScore(awayScore)) add("awayScore", "Informe os gols do visitante para encerrar a partida.");
    if (input.kickoffAt.getTime() > now.getTime()) {
      add("status", "Uma partida futura não pode ser marcada como encerrada.");
    }
  } else if (input.status === "LIVE") {
    const bothEmpty = homeScore === null && awayScore === null;
    if (!bothEmpty && (!validScore(homeScore) || !validScore(awayScore))) {
      add("homeScore", "Informe o placar completo ou deixe os dois campos vazios.");
    }
  } else {
    homeScore = null;
    awayScore = null;
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: { ...input, homeScore, awayScore } };
}

export type Outcome = "WIN" | "DRAW" | "LOSS";

/** Resultado do ponto de vista de uma equipe. Devolve null quando a partida não tem resultado válido. */
export function outcomeFor(
  teamId: string,
  match: { homeTeamId: string; awayTeamId: string; homeScore: number | null; awayScore: number | null; status: string },
): Outcome | null {
  if (match.status !== "FINISHED" || match.homeScore === null || match.awayScore === null) return null;
  const isHome = match.homeTeamId === teamId;
  const isAway = match.awayTeamId === teamId;
  if (!isHome && !isAway) return null;
  const own = isHome ? match.homeScore : match.awayScore;
  const other = isHome ? match.awayScore : match.homeScore;
  if (own > other) return "WIN";
  if (own < other) return "LOSS";
  return "DRAW";
}
