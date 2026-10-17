import { describe, expect, it } from "vitest";
import {
  AUTOMATION_TIMING,
  automationKey,
  callHeadline,
  clubHashtag,
  countScorers,
  formatScorers,
  newsCaption,
  planAutomationPosts,
  resultCaption,
  resultOutcome,
  shortKickoff,
  type MatchFact,
} from "@/modules/instagram/automations";

const now = new Date("2026-10-17T15:00:00Z"); // sábado, 12h em São Paulo
const HOUR = 3_600_000;
const enabledLongAgo = { enabled: true, enabledAt: new Date("2026-10-01T00:00:00Z") };
const all = { MATCH_RESULT: enabledLongAgo, MATCH_CALL: enabledLongAgo, MATCH_LINEUP: enabledLongAgo, NEWS_PUBLISHED: enabledLongAgo };

function match(over: Partial<MatchFact>): MatchFact {
  return { id: "m1", kickoffAt: new Date(now.getTime() + 20 * HOUR), status: "SCHEDULED", homeScore: null, awayScore: null, updatedAt: now, starters: 0, ...over };
}

function plan(over: Partial<Parameters<typeof planAutomationPosts>[0]>) {
  return planAutomationPosts({ now, automations: all, matches: [], news: [], existingKeys: new Set(), ...over });
}

describe("planejamento das automações", () => {
  it("resultado gera feed e story 30 min depois, só para jogo encerrado com placar", () => {
    const finished = match({ status: "FINISHED", kickoffAt: new Date(now.getTime() - 3 * HOUR), homeScore: 3, awayScore: 1 });
    const posts = plan({ matches: [finished] });
    expect(posts.map((p) => p.key)).toEqual(["resultado:m1:FEED", "resultado:m1:STORY"]);
    expect(posts[0]!.scheduledAt.getTime()).toBe(now.getTime() + AUTOMATION_TIMING.resultDelay);
    expect(plan({ matches: [{ ...finished, homeScore: null }] })).toEqual([]);
    expect(plan({ matches: [{ ...finished, kickoffAt: new Date(now.getTime() - 5 * 24 * HOUR) }] })).toEqual([]);
  });

  it("não reprocessa o que aconteceu antes de ligar a automação", () => {
    const finished = match({ status: "FINISHED", kickoffAt: new Date(now.getTime() - 3 * HOUR), homeScore: 1, awayScore: 1, updatedAt: new Date(now.getTime() - 2 * HOUR) });
    const justEnabled = { ...all, MATCH_RESULT: { enabled: true, enabledAt: new Date(now.getTime() - HOUR) } };
    expect(plan({ automations: justEnabled, matches: [finished] })).toEqual([]);
    expect(plan({ automations: justEnabled, matches: [{ ...finished, updatedAt: now }] })).toHaveLength(2);
  });

  it("automação desligada não gera nada", () => {
    const finished = match({ status: "FINISHED", kickoffAt: new Date(now.getTime() - HOUR), homeScore: 2, awayScore: 0 });
    expect(plan({ automations: { MATCH_RESULT: { enabled: false, enabledAt: null } }, matches: [finished] })).toEqual([]);
  });

  it("chamada sai 24 h antes, só com pelo menos 2 h de antecedência", () => {
    const tomorrow = match({ kickoffAt: new Date(now.getTime() + 30 * HOUR) });
    expect(plan({ matches: [tomorrow] })).toEqual([]);
    const posts = plan({ matches: [tomorrow] , now: new Date(now.getTime() + 7 * HOUR) });
    expect(posts.map((p) => p.key)).toEqual(["chamada:m1:STORY"]);
    expect(plan({ matches: [match({ kickoffAt: new Date(now.getTime() + HOUR) })] })).toEqual([]);
  });

  it("escalação só sai com titulares salvos, 2 h antes", () => {
    const soon = match({ kickoffAt: new Date(now.getTime() + 2.5 * HOUR) });
    expect(plan({ matches: [soon], automations: { MATCH_LINEUP: enabledLongAgo } })).toEqual([]);
    const posts = plan({ matches: [{ ...soon, starters: 11 }], automations: { MATCH_LINEUP: enabledLongAgo } });
    expect(posts).toHaveLength(1);
    expect(posts[0]!.scheduledAt.getTime()).toBe(now.getTime() + 0.5 * HOUR);
  });

  it("notícia publicada vira feed 10 min depois", () => {
    const posts = plan({ news: [{ id: "n1", status: "PUBLISHED", publishedAt: new Date(now.getTime() - 60_000) }] });
    expect(posts.map((p) => p.key)).toEqual(["noticia:n1:FEED"]);
    expect(posts[0]!.scheduledAt.getTime()).toBe(now.getTime() - 60_000 + AUTOMATION_TIMING.newsDelay);
    expect(plan({ news: [{ id: "n2", status: "DRAFT", publishedAt: now }] })).toEqual([]);
    expect(plan({ news: [{ id: "n3", status: "PUBLISHED", publishedAt: new Date(now.getTime() + HOUR) }] })).toEqual([]);
  });

  it("não repete o que já existe", () => {
    const finished = match({ status: "FINISHED", kickoffAt: new Date(now.getTime() - HOUR), homeScore: 2, awayScore: 0 });
    const posts = plan({ matches: [finished], existingKeys: new Set([automationKey("MATCH_RESULT", "m1", "FEED")]) });
    expect(posts.map((p) => p.key)).toEqual(["resultado:m1:STORY"]);
  });
});

describe("textos das automações", () => {
  it("hashtag do clube sem acentos nem espaços", () => {
    expect(clubHashtag("Último Gole FC")).toBe("#UltimoGoleFC");
    expect(clubHashtag("  ")).toBe("");
  });

  it("artilheiros agrupados na ordem dos gols", () => {
    const scorers = countScorers(["Rafa", null, "Dudu", "Rafa"]);
    expect(scorers).toEqual([{ name: "Rafa", goals: 2 }, { name: "Dudu", goals: 1 }]);
    expect(formatScorers(scorers)).toBe("Rafa 2, Dudu");
  });

  it("resultado do ponto de vista do nosso clube", () => {
    expect(resultOutcome(true, 3, 1)).toBe("Vitória");
    expect(resultOutcome(false, 3, 1)).toBe("Derrota");
    expect(resultOutcome(false, 2, 2)).toBe("Empate");
  });

  it("legendas", () => {
    const caption = resultCaption({ homeName: "Último Gole FC", awayName: "Adversário FC", homeScore: 3, awayScore: 1, competition: "Campeonato de Verão", scorers: [{ name: "Rafa", goals: 2 }], hashtag: "#UltimoGoleFC" });
    expect(caption).toBe("Fim de jogo: Último Gole FC 3 × 1 Adversário FC.\nCampeonato de Verão\nGols: Rafa 2.\n\n#UltimoGoleFC");
    expect(newsCaption({ title: "T", summary: "S", url: "https://x/noticias/t", hashtag: "" })).toBe("T\n\nS\n\nLeia a notícia completa no site: https://x/noticias/t");
  });

  it("data curta e título da chamada em horário de São Paulo", () => {
    expect(shortKickoff(new Date("2026-10-18T12:00:00Z"))).toBe("dom 18/10 · 9h");
    expect(shortKickoff(new Date("2026-10-18T12:30:00Z"))).toBe("dom 18/10 · 9h30");
    expect(callHeadline(new Date("2026-10-17T22:00:00Z"), now)).toBe("Hoje tem jogo");
    expect(callHeadline(new Date("2026-10-18T12:00:00Z"), now)).toBe("Amanhã tem jogo");
    expect(callHeadline(new Date("2026-10-20T22:00:00Z"), now)).toBe("Terça-feira tem jogo");
  });
});
