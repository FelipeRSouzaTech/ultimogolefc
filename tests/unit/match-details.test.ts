import { describe, expect, it } from "vitest";
import { parseCount, validateManualTable, type ManualRow } from "@/modules/competitions/manual";
import { formatMinute, goalsMismatch, sortEvents, tallyGoals, validateLineup } from "@/modules/matches/events";

const match = { homeTeamId: "h", awayTeamId: "a", homeScore: 2, awayScore: 1 };
const event = (type: string, clubId: string, minute: number | null = null) => ({ type, clubId, minute });

describe("lances da partida", () => {
  it("soma gols por lado e credita gol contra ao adversário", () => {
    const events = [event("GOAL", "h"), event("PENALTY_GOAL", "a"), event("OWN_GOAL", "a"), event("YELLOW_CARD", "h"), event("SUBSTITUTION", "a")];
    expect(tallyGoals(events, "h", "a")).toEqual({ home: 2, away: 1 });
    expect(tallyGoals([event("OWN_GOAL", "h")], "h", "a")).toEqual({ home: 0, away: 1 });
  });

  it("ignora lances de clubes que não estão na partida", () => {
    expect(tallyGoals([event("GOAL", "outro")], "h", "a")).toEqual({ home: 0, away: 0 });
  });

  it("não avisa quando os lances batem com o placar ou quando nenhum gol foi lançado", () => {
    expect(goalsMismatch([event("GOAL", "h"), event("GOAL", "h"), event("GOAL", "a")], match)).toBeNull();
    expect(goalsMismatch([event("YELLOW_CARD", "h")], match)).toBeNull();
    expect(goalsMismatch([], match)).toBeNull();
  });

  it("avisa quando os lances divergem do placar ou a partida está sem placar", () => {
    expect(goalsMismatch([event("GOAL", "h")], match)).toBeTruthy();
    expect(goalsMismatch([event("GOAL", "h")], { ...match, homeScore: null, awayScore: null })).toBeTruthy();
  });

  it("ordena por minuto, deixando os sem minuto no fim", () => {
    const base = new Date("2026-10-09T12:00:00Z");
    const events = [
      { id: "sem", minute: null, createdAt: base },
      { id: "45", minute: 45, createdAt: base },
      { id: "10b", minute: 10, createdAt: new Date(base.getTime() + 1000) },
      { id: "10a", minute: 10, createdAt: base },
    ];
    expect(sortEvents(events).map((item) => item.id)).toEqual(["10a", "10b", "45", "sem"]);
    expect(formatMinute(45)).toBe("45'");
    expect(formatMinute(null)).toBe("—");
  });
});

describe("escalação", () => {
  const squad = Array.from({ length: 14 }, (_, index) => `p${index + 1}`);

  it("aceita até 11 titulares mais reservas", () => {
    const entries = squad.map((athleteId, index) => ({ athleteId, role: index < 11 ? ("STARTER" as const) : ("SUBSTITUTE" as const) }));
    expect(validateLineup(entries, squad)).toBeNull();
    expect(validateLineup([], squad)).toBeNull();
  });

  it("recusa mais de 11 titulares, jogador repetido e jogador fora do elenco", () => {
    expect(validateLineup(squad.slice(0, 12).map((athleteId) => ({ athleteId, role: "STARTER" as const })), squad)).toBeTruthy();
    expect(validateLineup([{ athleteId: "p1", role: "STARTER" }, { athleteId: "p1", role: "SUBSTITUTE" }], squad)).toBeTruthy();
    expect(validateLineup([{ athleteId: "intruso", role: "STARTER" }], squad)).toBeTruthy();
  });
});

describe("classificação manual", () => {
  const row = (clubId: string, position: number, overrides: Partial<ManualRow> = {}): ManualRow => ({
    clubId,
    position,
    played: 2,
    wins: 1,
    draws: 1,
    losses: 0,
    goalsFor: 3,
    goalsAgainst: 1,
    points: 4,
    ...overrides,
  });
  const participants = ["a", "b", "c"];

  it("aceita tabela completa e coerente", () => {
    expect(validateManualTable([row("a", 1), row("b", 2), row("c", 3)], participants)).toEqual([]);
  });

  it("exige uma linha por participante e recusa clube de fora", () => {
    expect(validateManualTable([row("a", 1), row("b", 2)], participants).length).toBeGreaterThan(0);
    expect(validateManualTable([row("a", 1), row("b", 2), row("x", 3)], participants).length).toBeGreaterThan(0);
  });

  it("exige posições de 1 a N sem repetição", () => {
    expect(validateManualTable([row("a", 1), row("b", 1), row("c", 3)], participants).length).toBeGreaterThan(0);
    expect(validateManualTable([row("a", 2), row("b", 3), row("c", 4)], participants).length).toBeGreaterThan(0);
  });

  it("exige jogos igual à soma de vitórias, empates e derrotas, citando o clube", () => {
    const errors = validateManualTable([row("a", 1, { played: 5 }), row("b", 2), row("c", 3)], participants, { a: "Alfa" });
    expect(errors).toHaveLength(1);
    expect(errors[0]?.startsWith("Alfa:")).toBe(true);
  });

  it("lê números do formulário: vazio vira zero, lixo é recusado", () => {
    expect(parseCount("")).toBe(0);
    expect(parseCount(" 12 ")).toBe(12);
    expect(parseCount("-1")).toBeNull();
    expect(parseCount("1.5")).toBeNull();
    expect(parseCount("abc")).toBeNull();
  });
});
