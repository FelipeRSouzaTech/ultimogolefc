import { describe, expect, it } from "vitest";
import { outcomeFor, validateMatch, type MatchInput } from "@/modules/matches/rules";

const now = new Date("2026-10-09T15:00:00Z");
const participants = ["a", "b", "c"];

const base = (overrides: Partial<MatchInput> = {}): MatchInput => ({
  homeTeamId: "a",
  awayTeamId: "b",
  kickoffAt: new Date("2026-10-01T19:00:00Z"),
  status: "SCHEDULED",
  homeScore: null,
  awayScore: null,
  ...overrides,
});

describe("validateMatch", () => {
  it("aceita uma partida agendada válida", () => {
    const result = validateMatch(base({ kickoffAt: new Date("2026-11-01T19:00:00Z") }), participants, now);
    expect(result.ok).toBe(true);
  });

  it("recusa mandante igual ao visitante", () => {
    const result = validateMatch(base({ awayTeamId: "a" }), participants, now);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.awayTeamId).toBeTruthy();
  });

  it("recusa equipe que não participa da temporada", () => {
    const result = validateMatch(base({ homeTeamId: "x" }), participants, now);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.homeTeamId).toBeTruthy();
  });

  it("exige placar completo para encerrar", () => {
    const result = validateMatch(base({ status: "FINISHED", homeScore: 2 }), participants, now);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.awayScore).toBeTruthy();
  });

  it("recusa placar negativo ou não inteiro", () => {
    expect(validateMatch(base({ status: "FINISHED", homeScore: -1, awayScore: 0 }), participants, now).ok).toBe(false);
    expect(validateMatch(base({ status: "FINISHED", homeScore: 1.5, awayScore: 0 }), participants, now).ok).toBe(false);
  });

  it("não permite encerrar uma partida futura", () => {
    const result = validateMatch(base({ status: "FINISHED", homeScore: 1, awayScore: 0, kickoffAt: new Date("2026-12-01T19:00:00Z") }), participants, now);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.status).toBeTruthy();
  });

  it("aceita partida encerrada com placar, inclusive 0 a 0", () => {
    const result = validateMatch(base({ status: "FINISHED", homeScore: 0, awayScore: 0 }), participants, now);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toMatchObject({ homeScore: 0, awayScore: 0 });
  });

  it("descarta o placar de partidas agendadas, adiadas ou canceladas", () => {
    for (const status of ["SCHEDULED", "POSTPONED", "CANCELLED"] as const) {
      const result = validateMatch(base({ status, homeScore: 3, awayScore: 1 }), participants, now);
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toMatchObject({ homeScore: null, awayScore: null });
    }
  });

  it("recusa data inválida", () => {
    expect(validateMatch(base({ kickoffAt: new Date("invalida") }), participants, now).ok).toBe(false);
  });
});

describe("outcomeFor", () => {
  const match = { homeTeamId: "a", awayTeamId: "b", homeScore: 2, awayScore: 1, status: "FINISHED" };

  it("identifica vitória, derrota e empate do ponto de vista da equipe", () => {
    expect(outcomeFor("a", match)).toBe("WIN");
    expect(outcomeFor("b", match)).toBe("LOSS");
    expect(outcomeFor("a", { ...match, awayScore: 2 })).toBe("DRAW");
  });

  it("não trata partida sem resultado como empate", () => {
    expect(outcomeFor("a", { ...match, homeScore: null, awayScore: null })).toBeNull();
    expect(outcomeFor("a", { ...match, status: "SCHEDULED" })).toBeNull();
    expect(outcomeFor("c", match)).toBeNull();
  });
});
