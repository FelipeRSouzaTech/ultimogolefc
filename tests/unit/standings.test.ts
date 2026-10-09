import { describe, expect, it } from "vitest";
import { computeStandings, type StandingsMatch, type StandingsRules } from "@/modules/competitions/standings";

const teams = [
  { id: "a", name: "Alfa" },
  { id: "b", name: "Bravo" },
  { id: "c", name: "Charlie" },
  { id: "d", name: "Delta" },
];

const finished = (homeTeamId: string, awayTeamId: string, homeScore: number, awayScore: number): StandingsMatch => ({
  homeTeamId,
  awayTeamId,
  homeScore,
  awayScore,
  status: "FINISHED",
});

const rules = (overrides: Partial<StandingsRules> = {}): StandingsRules => ({
  pointsWin: 3,
  pointsDraw: 1,
  pointsLoss: 0,
  tiebreakers: ["WINS", "GOAL_DIFFERENCE", "GOALS_FOR"],
  ...overrides,
});

describe("computeStandings", () => {
  it("lista todos os participantes zerados quando não há partidas", () => {
    const table = computeStandings(teams, [], rules());
    expect(table).toHaveLength(4);
    expect(table.every((row) => row.played === 0 && row.points === 0)).toBe(true);
    expect(table.map((row) => row.position)).toEqual([1, 2, 3, 4]);
    expect(table.map((row) => row.teamName)).toEqual(["Alfa", "Bravo", "Charlie", "Delta"]);
  });

  it("calcula jogos, vitórias, empates, derrotas, gols, saldo e pontos", () => {
    const table = computeStandings(teams, [finished("a", "b", 2, 0), finished("b", "a", 1, 1), finished("a", "c", 0, 1)], rules());
    const alfa = table.find((row) => row.teamId === "a");
    expect(alfa).toMatchObject({ played: 3, wins: 1, draws: 1, losses: 1, goalsFor: 3, goalsAgainst: 2, goalDifference: 1, points: 4 });
    const bravo = table.find((row) => row.teamId === "b");
    expect(bravo).toMatchObject({ played: 2, wins: 0, draws: 1, losses: 1, goalsFor: 1, goalsAgainst: 3, goalDifference: -2, points: 1 });
  });

  it("ignora partidas agendadas, adiadas, canceladas, em andamento e sem placar", () => {
    const matches: StandingsMatch[] = [
      { homeTeamId: "a", awayTeamId: "b", homeScore: null, awayScore: null, status: "SCHEDULED" },
      { homeTeamId: "a", awayTeamId: "b", homeScore: 3, awayScore: 0, status: "POSTPONED" },
      { homeTeamId: "a", awayTeamId: "b", homeScore: 3, awayScore: 0, status: "CANCELLED" },
      { homeTeamId: "a", awayTeamId: "b", homeScore: 1, awayScore: 0, status: "LIVE" },
      { homeTeamId: "a", awayTeamId: "b", homeScore: null, awayScore: null, status: "FINISHED" },
      { homeTeamId: "a", awayTeamId: "b", homeScore: 2, awayScore: null, status: "FINISHED" },
    ];
    const table = computeStandings(teams, matches, rules());
    expect(table.every((row) => row.played === 0 && row.points === 0 && row.draws === 0)).toBe(true);
  });

  it("ignora partidas com equipe que não participa da temporada", () => {
    const table = computeStandings(teams, [finished("a", "zzz", 5, 0)], rules());
    expect(table.find((row) => row.teamId === "a")?.played).toBe(0);
    expect(table).toHaveLength(4);
  });

  it("respeita a pontuação configurada", () => {
    const table = computeStandings(teams, [finished("a", "b", 1, 0), finished("c", "d", 2, 2)], rules({ pointsWin: 2, pointsDraw: 1, pointsLoss: 0 }));
    expect(table.find((row) => row.teamId === "a")?.points).toBe(2);
    expect(table.find((row) => row.teamId === "c")?.points).toBe(1);
    expect(table.find((row) => row.teamId === "b")?.points).toBe(0);
  });

  it("ordena por pontos antes de qualquer critério de desempate", () => {
    const table = computeStandings(teams, [finished("a", "b", 1, 0), finished("c", "d", 9, 9)], rules());
    expect(table[0]?.teamId).toBe("a");
  });

  it("desempata por número de vitórias", () => {
    // Alfa: 1V 0E 1D = 3 pts; Bravo: 0V 3E = 3 pts.
    const matches = [finished("a", "c", 1, 0), finished("d", "a", 1, 0), finished("b", "c", 0, 0), finished("b", "d", 1, 1), finished("c", "b", 2, 2)];
    const table = computeStandings(teams, matches, rules({ tiebreakers: ["WINS"] }));
    const order = table.map((row) => row.teamId);
    expect(order.indexOf("a")).toBeLessThan(order.indexOf("b"));
  });

  it("desempata por saldo de gols e depois por gols pró", () => {
    const three = teams.slice(0, 3);
    // Todos com 3 pontos e 1 vitória. Saldos: Alfa +2, Bravo 0, Charlie -2.
    const bySaldo = computeStandings(three, [finished("a", "b", 3, 0), finished("b", "c", 3, 0), finished("c", "a", 1, 0)], rules({ tiebreakers: ["GOAL_DIFFERENCE"] }));
    expect(bySaldo.map((row) => row.teamId)).toEqual(["a", "b", "c"]);

    // Saldos iguais (0); gols pró: Bravo 4, Charlie 3, Alfa 2.
    const byGols = computeStandings(three, [finished("a", "b", 2, 1), finished("b", "c", 3, 2), finished("c", "a", 1, 0)], rules({ tiebreakers: ["GOAL_DIFFERENCE", "GOALS_FOR"] }));
    expect(byGols.map((row) => row.goalDifference)).toEqual([0, 0, 0]);
    expect(byGols.map((row) => row.teamId)).toEqual(["b", "c", "a"]);
  });

  it("desempata por menos gols sofridos", () => {
    const two = teams.slice(0, 2);
    const extra = [...two, { id: "c", name: "Charlie" }];
    // Alfa vence Charlie por 1x0; Bravo vence Charlie por 3x2: mesmos pontos e saldo, Alfa sofreu menos.
    const table = computeStandings(extra, [finished("a", "c", 1, 0), finished("b", "c", 3, 2)], rules({ tiebreakers: ["GOAL_DIFFERENCE", "GOALS_AGAINST"] }));
    expect(table.map((row) => row.teamId)).toEqual(["a", "b", "c"]);
  });

  it("desempata por confronto direto", () => {
    // Alfa e Bravo terminam com 6 pontos; Bravo venceu o confronto direto, embora Alfa tenha saldo maior.
    const matches = [finished("b", "a", 1, 0), finished("a", "c", 5, 0), finished("a", "d", 5, 0), finished("b", "c", 1, 0), finished("d", "b", 1, 0)];
    const h2hFirst = computeStandings(teams, matches, rules({ tiebreakers: ["HEAD_TO_HEAD", "GOAL_DIFFERENCE"] }));
    expect(h2hFirst.slice(0, 2).map((row) => row.teamId)).toEqual(["b", "a"]);
    const saldoFirst = computeStandings(teams, matches, rules({ tiebreakers: ["GOAL_DIFFERENCE", "HEAD_TO_HEAD"] }));
    expect(saldoFirst.slice(0, 2).map((row) => row.teamId)).toEqual(["a", "b"]);
  });

  it("usa ordem alfabética quando todos os critérios empatam", () => {
    const table = computeStandings([teams[3]!, teams[1]!], [finished("d", "b", 1, 1)], rules());
    expect(table.map((row) => row.teamName)).toEqual(["Bravo", "Delta"]);
  });

  it("recalcula corretamente após a correção de um resultado", () => {
    const before = computeStandings(teams, [finished("a", "b", 2, 1)], rules());
    expect(before[0]).toMatchObject({ teamId: "a", points: 3 });
    const after = computeStandings(teams, [finished("a", "b", 1, 2)], rules());
    expect(after[0]).toMatchObject({ teamId: "b", points: 3, wins: 1 });
    expect(after.find((row) => row.teamId === "a")).toMatchObject({ points: 0, losses: 1, wins: 0 });
  });

  it("mantém a soma dos saldos em zero e posições sequenciais", () => {
    const matches = [finished("a", "b", 2, 1), finished("c", "d", 0, 0), finished("a", "c", 1, 3), finished("b", "d", 4, 4)];
    const table = computeStandings(teams, matches, rules());
    expect(table.reduce((sum, row) => sum + row.goalDifference, 0)).toBe(0);
    expect(table.map((row) => row.position)).toEqual([1, 2, 3, 4]);
    expect(table.reduce((sum, row) => sum + row.played, 0)).toBe(8);
  });
});
