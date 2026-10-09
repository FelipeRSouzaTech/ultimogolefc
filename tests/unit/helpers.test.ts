import { describe, expect, it } from "vitest";
import { formatDate, formatTime, saoPauloLocalToUtc, utcToSaoPauloLocal } from "@/lib/datetime";
import { slugify, uniqueSlug } from "@/lib/slug";
import { clubSchema, matchSchema, seasonSchema } from "@/lib/validation/football";

describe("datas no fuso de São Paulo", () => {
  it("formata data como DD/MM/AAAA e hora em 24h", () => {
    const date = new Date("2026-10-09T18:30:00Z");
    expect(formatDate(date)).toBe("09/10/2026");
    expect(formatTime(date)).toBe("15:30");
  });

  it("vira o dia corretamente perto da meia-noite", () => {
    expect(formatDate(new Date("2026-10-10T02:00:00Z"))).toBe("09/10/2026");
    expect(formatTime(new Date("2026-10-10T03:00:00Z"))).toBe("00:00");
  });

  it("converte horário local de São Paulo para UTC e de volta", () => {
    const utc = saoPauloLocalToUtc("2026-10-09T15:30");
    expect(utc?.toISOString()).toBe("2026-10-09T18:30:00.000Z");
    expect(utcToSaoPauloLocal(new Date("2026-10-09T18:30:00Z"))).toBe("2026-10-09T15:30");
    expect(saoPauloLocalToUtc("2026-01-01T00:00")?.toISOString()).toBe("2026-01-01T03:00:00.000Z");
  });

  it("recusa textos e datas inexistentes", () => {
    expect(saoPauloLocalToUtc("")).toBeNull();
    expect(saoPauloLocalToUtc("09/10/2026 15:30")).toBeNull();
    expect(saoPauloLocalToUtc("2026-02-31T10:00")).toBeNull();
    expect(saoPauloLocalToUtc("2026-10-09T25:00")).toBeNull();
  });
});

describe("slugs", () => {
  it("remove acentos, espaços e símbolos", () => {
    expect(slugify("Último Gole FC vence na estreia!")).toBe("ultimo-gole-fc-vence-na-estreia");
    expect(slugify("  --Ação & Reação--  ")).toBe("acao-reacao");
    expect(slugify("!!!")).toBe("");
  });

  it("gera sufixo quando o slug já existe", async () => {
    const taken = new Set(["noticia", "noticia-2"]);
    expect(await uniqueSlug("Notícia", async (slug) => taken.has(slug))).toBe("noticia-3");
    expect(await uniqueSlug("???", async () => false)).toBe("item");
  });
});

describe("validação de futebol", () => {
  it("aceita apenas caminho local de imagem para o escudo", () => {
    const base = { name: "Clube Teste", shortName: "" };
    expect(clubSchema.safeParse({ ...base, crestPath: "" }).success).toBe(true);
    expect(clubSchema.safeParse({ ...base, crestPath: "/brand/escudo.png" }).success).toBe(true);
    expect(clubSchema.safeParse({ ...base, crestPath: "https://exemplo.com/a.png" }).success).toBe(false);
    expect(clubSchema.safeParse({ ...base, crestPath: "javascript:alert(1)" }).success).toBe(false);
  });

  it("converte placar vazio em null e recusa valores inválidos", () => {
    const base = {
      seasonId: "s1",
      homeTeamId: "a",
      awayTeamId: "b",
      kickoffAt: "2026-10-09T15:30",
      venue: "",
      round: "",
      status: "SCHEDULED",
      notes: "",
    };
    const empty = matchSchema.safeParse({ ...base, homeScore: "", awayScore: "" });
    expect(empty.success).toBe(true);
    if (empty.success) expect(empty.data.homeScore).toBeNull();
    const filled = matchSchema.safeParse({ ...base, homeScore: "0", awayScore: "12" });
    expect(filled.success).toBe(true);
    if (filled.success) expect([filled.data.homeScore, filled.data.awayScore]).toEqual([0, 12]);
    expect(matchSchema.safeParse({ ...base, homeScore: "-1", awayScore: "0" }).success).toBe(false);
    expect(matchSchema.safeParse({ ...base, homeScore: "abc", awayScore: "0" }).success).toBe(false);
  });

  it("valida pontuação e critérios da temporada", () => {
    const base = { label: "2026", regulation: "", pointsWin: "3", pointsDraw: "1", pointsLoss: "0", standingsMode: "AUTO", isCurrent: true };
    const ok = seasonSchema.safeParse({ ...base, tiebreakers: ["WINS", "HEAD_TO_HEAD"] });
    expect(ok.success).toBe(true);
    if (ok.success) expect(ok.data.pointsWin).toBe(3);
    expect(seasonSchema.safeParse({ ...base, tiebreakers: ["SORTEIO"] }).success).toBe(false);
    expect(seasonSchema.safeParse({ ...base, pointsWin: "-3", tiebreakers: [] }).success).toBe(false);
  });
});
