// Cálculo de classificação. Módulo puro: recebe dados, devolve a tabela. Sem acesso a banco.

export const TIEBREAKERS = ["WINS", "GOAL_DIFFERENCE", "GOALS_FOR", "GOALS_AGAINST", "HEAD_TO_HEAD"] as const;
export type Tiebreaker = (typeof TIEBREAKERS)[number];

export const TIEBREAKER_LABELS: Record<Tiebreaker, string> = {
  WINS: "Número de vitórias",
  GOAL_DIFFERENCE: "Saldo de gols",
  GOALS_FOR: "Gols pró",
  GOALS_AGAINST: "Menos gols sofridos",
  HEAD_TO_HEAD: "Confronto direto",
};

export type StandingsRules = {
  pointsWin: number;
  pointsDraw: number;
  pointsLoss: number;
  tiebreakers: readonly Tiebreaker[];
};

export const DEFAULT_RULES: StandingsRules = {
  pointsWin: 3,
  pointsDraw: 1,
  pointsLoss: 0,
  tiebreakers: ["WINS", "GOAL_DIFFERENCE", "GOALS_FOR"],
};

export type StandingsTeam = { id: string; name: string };

export type StandingsMatch = {
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
};

export type StandingRow = {
  position: number;
  teamId: string;
  teamName: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
};

type Stats = Omit<StandingRow, "position">;

/** Só contam partidas ENCERRADAS e com placar completo. Adiadas, canceladas e sem placar ficam de fora. */
export function isCountable(match: StandingsMatch): match is StandingsMatch & { homeScore: number; awayScore: number } {
  return (
    match.status === "FINISHED" &&
    match.homeScore !== null &&
    match.awayScore !== null &&
    Number.isInteger(match.homeScore) &&
    Number.isInteger(match.awayScore) &&
    match.homeScore >= 0 &&
    match.awayScore >= 0
  );
}

function tally(teams: readonly StandingsTeam[], matches: readonly StandingsMatch[], rules: StandingsRules): Map<string, Stats> {
  const table = new Map<string, Stats>();
  for (const team of teams) {
    table.set(team.id, {
      teamId: team.id,
      teamName: team.name,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
    });
  }
  for (const match of matches) {
    if (!isCountable(match) || match.homeTeamId === match.awayTeamId) continue;
    const home = table.get(match.homeTeamId);
    const away = table.get(match.awayTeamId);
    // Partidas com equipe fora da lista de participantes são ignoradas.
    if (!home || !away) continue;

    home.played += 1;
    away.played += 1;
    home.goalsFor += match.homeScore;
    home.goalsAgainst += match.awayScore;
    away.goalsFor += match.awayScore;
    away.goalsAgainst += match.homeScore;

    if (match.homeScore > match.awayScore) {
      home.wins += 1;
      away.losses += 1;
      home.points += rules.pointsWin;
      away.points += rules.pointsLoss;
    } else if (match.homeScore < match.awayScore) {
      away.wins += 1;
      home.losses += 1;
      away.points += rules.pointsWin;
      home.points += rules.pointsLoss;
    } else {
      home.draws += 1;
      away.draws += 1;
      home.points += rules.pointsDraw;
      away.points += rules.pointsDraw;
    }
  }
  for (const stats of table.values()) {
    stats.goalDifference = stats.goalsFor - stats.goalsAgainst;
  }
  return table;
}

type Criterion = "POINTS" | Tiebreaker;

/** Valor comparável (maior é melhor) de cada equipe do grupo empatado para um critério. */
function criterionKeys(
  group: readonly Stats[],
  criterion: Criterion,
  matches: readonly StandingsMatch[],
  rules: StandingsRules,
): Map<string, number[]> {
  const keys = new Map<string, number[]>();
  if (criterion === "HEAD_TO_HEAD") {
    // Mini-tabela considerando somente os jogos entre as equipes empatadas.
    const ids = new Set(group.map((team) => team.teamId));
    const direct = matches.filter((match) => ids.has(match.homeTeamId) && ids.has(match.awayTeamId));
    const mini = tally(
      group.map((team) => ({ id: team.teamId, name: team.teamName })),
      direct,
      rules,
    );
    for (const team of group) {
      const stats = mini.get(team.teamId);
      keys.set(team.teamId, stats ? [stats.points, stats.goalDifference, stats.goalsFor] : [0, 0, 0]);
    }
    return keys;
  }
  for (const team of group) {
    let value: number;
    switch (criterion) {
      case "POINTS":
        value = team.points;
        break;
      case "WINS":
        value = team.wins;
        break;
      case "GOAL_DIFFERENCE":
        value = team.goalDifference;
        break;
      case "GOALS_FOR":
        value = team.goalsFor;
        break;
      case "GOALS_AGAINST":
        value = -team.goalsAgainst;
        break;
    }
    keys.set(team.teamId, [value]);
  }
  return keys;
}

function compareKeys(a: readonly number[], b: readonly number[]): number {
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    const diff = (b[i] ?? 0) - (a[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

function sortGroup(
  group: readonly Stats[],
  criteria: readonly Criterion[],
  index: number,
  matches: readonly StandingsMatch[],
  rules: StandingsRules,
): Stats[] {
  if (group.length <= 1) return [...group];
  const criterion = criteria[index];
  if (criterion === undefined) {
    // Esgotados os critérios: ordem alfabética, apenas para o resultado ser estável e previsível.
    return [...group].sort((a, b) => a.teamName.localeCompare(b.teamName, "pt-BR") || a.teamId.localeCompare(b.teamId));
  }
  const keys = criterionKeys(group, criterion, matches, rules);
  const keyOf = (team: Stats) => keys.get(team.teamId) ?? [];
  const ordered = [...group].sort((a, b) => compareKeys(keyOf(a), keyOf(b)));

  const result: Stats[] = [];
  let bucket: Stats[] = [];
  for (const team of ordered) {
    const previous = bucket[0];
    if (previous && compareKeys(keyOf(previous), keyOf(team)) !== 0) {
      result.push(...sortGroup(bucket, criteria, index + 1, matches, rules));
      bucket = [];
    }
    bucket.push(team);
  }
  result.push(...sortGroup(bucket, criteria, index + 1, matches, rules));
  return result;
}

/**
 * Calcula a tabela a partir das partidas válidas.
 * Ordena por pontos e, em caso de empate, aplica os critérios de desempate na ordem configurada.
 */
export function computeStandings(
  teams: readonly StandingsTeam[],
  matches: readonly StandingsMatch[],
  rules: StandingsRules = DEFAULT_RULES,
): StandingRow[] {
  const table = tally(teams, matches, rules);
  const unique = rules.tiebreakers.filter((item, i, all) => all.indexOf(item) === i);
  const criteria: Criterion[] = ["POINTS", ...unique];
  const sorted = sortGroup([...table.values()], criteria, 0, matches, rules);
  return sorted.map((stats, i) => ({ position: i + 1, ...stats }));
}
