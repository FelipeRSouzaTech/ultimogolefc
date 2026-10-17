import { describe, expect, it } from "vitest";
import { createInstagramClient, instagramConfig, InstagramApiError, type InstagramConfig } from "@/lib/instagram/client";
import { instagramPostSchema } from "@/lib/validation/instagram";
import {
  internalSchedulerEnabled,
  captionError,
  checkAspectRatio,
  countHashtags,
  describeGraphError,
  groupByDay,
  isDeletable,
  isDue,
  isEditable,
  isJpegPath,
  LOCK_TIMEOUT_MS,
  MAX_ATTEMPTS,
  publicImageUrl,
  scheduleError,
  shiftWeek,
  statusAfterFailure,
  weekDays,
  weekStartKey,
} from "@/modules/instagram/rules";

const now = new Date("2026-10-16T15:00:00Z"); // sexta-feira, 12h em São Paulo

describe("legenda", () => {
  it("conta hashtags separadas por espaço", () => {
    expect(countHashtags("Vitória! #UltimoGoleFC #FutebolAmador")).toBe(2);
    expect(countHashtags("sem hashtag aqui, só #")).toBe(0);
    expect(countHashtags("#um#dois")).toBe(1);
  });

  it("story não aceita legenda; feed aceita até o limite", () => {
    expect(captionError("STORY", null)).toBeNull();
    expect(captionError("STORY", "  ")).toBeNull();
    expect(captionError("STORY", "Hoje tem jogo")).toMatch(/não levam legenda/);
    expect(captionError("FEED", "Fim de jogo: 3 × 1")).toBeNull();
    expect(captionError("FEED", "a".repeat(2201))).toMatch(/2\.200/);
    expect(captionError("FEED", Array.from({ length: 31 }, (_, i) => `#tag${i}`).join(" "))).toMatch(/30 hashtags/);
  });
});

describe("estados", () => {
  it("só edita o que ainda não saiu e só exclui o que não está na fila", () => {
    expect(isEditable("DRAFT")).toBe(true);
    expect(isEditable("SCHEDULED")).toBe(true);
    expect(isEditable("PUBLISHING")).toBe(false);
    expect(isEditable("PUBLISHED")).toBe(false);
    expect(isDeletable("SCHEDULED")).toBe(false);
    expect(isDeletable("FAILED")).toBe(true);
    expect(isDeletable("PUBLISHED")).toBe(false);
  });

  it("agendamento precisa ser no futuro, com 1 minuto de tolerância", () => {
    expect(scheduleError(null, now)).toMatch(/Informe/);
    expect(scheduleError(new Date(now.getTime() - 5 * 60_000), now)).toMatch(/futuro/);
    expect(scheduleError(new Date(now.getTime() - 30_000), now)).toBeNull();
    expect(scheduleError(new Date(now.getTime() + 3_600_000), now)).toBeNull();
  });

  it("o agendador pega o que passou do horário e retoma publicações presas", () => {
    const base = { lockedAt: null };
    expect(isDue({ ...base, status: "SCHEDULED", scheduledAt: new Date(now.getTime() - 1000) }, now)).toBe(true);
    expect(isDue({ ...base, status: "SCHEDULED", scheduledAt: new Date(now.getTime() + 1000) }, now)).toBe(false);
    expect(isDue({ ...base, status: "DRAFT", scheduledAt: new Date(now.getTime() - 1000) }, now)).toBe(false);
    expect(isDue({ status: "PUBLISHING", scheduledAt: null, lockedAt: new Date(now.getTime() - 60_000) }, now)).toBe(false);
    expect(isDue({ status: "PUBLISHING", scheduledAt: null, lockedAt: new Date(now.getTime() - LOCK_TIMEOUT_MS - 1) }, now)).toBe(true);
  });

  it("repete falhas temporárias até o limite e desiste das permanentes", () => {
    expect(statusAfterFailure(1, true)).toBe("SCHEDULED");
    expect(statusAfterFailure(MAX_ATTEMPTS, true)).toBe("FAILED");
    expect(statusAfterFailure(1, false)).toBe("FAILED");
  });
});

describe("endereço público da imagem", () => {
  it("usa o bucket S3 quando existe, senão o endereço do portal", () => {
    expect(publicImageUrl("/midia/2026/10/abcdefabcdefabcdefabcdef.jpg", "https://ultimogole.com.br", "https://midia.ultimogole.com.br/")).toBe(
      "https://midia.ultimogole.com.br/2026/10/abcdefabcdefabcdefabcdef.jpg",
    );
    expect(publicImageUrl("/midia/2026/10/abcdefabcdefabcdefabcdef.jpg", "https://ultimogole.com.br/", null)).toBe(
      "https://ultimogole.com.br/midia/2026/10/abcdefabcdefabcdefabcdef.jpg",
    );
    expect(publicImageUrl("/brand/arte.jpg", "https://ultimogole.com.br", "https://midia.exemplo.com")).toBe("https://ultimogole.com.br/brand/arte.jpg");
  });

  it("recusa endereços que o Instagram não alcança", () => {
    expect(publicImageUrl("/midia/2026/10/abcdefabcdefabcdefabcdef.jpg", "http://localhost:3000", null)).toBeNull();
    expect(publicImageUrl("/midia/2026/10/abcdefabcdefabcdefabcdef.jpg", "https://localhost:3000", null)).toBeNull();
    expect(publicImageUrl("arte.jpg", "https://ultimogole.com.br", null)).toBeNull();
  });

  it("só JPEG", () => {
    expect(isJpegPath("/midia/2026/10/a.jpg")).toBe(true);
    expect(isJpegPath("/brand/a.JPEG")).toBe(true);
    expect(isJpegPath("/midia/2026/10/a.png")).toBe(false);
  });
});

describe("erros da Graph API", () => {
  it("token expirado não é repetido", () => {
    const info = describeGraphError({ code: 190, message: "Error validating access token" });
    expect(info.retryable).toBe(false);
    expect(info.message).toMatch(/token/);
  });

  it("limite de chamadas e instabilidade são repetidos", () => {
    expect(describeGraphError({ code: 4 }).retryable).toBe(true);
    expect(describeGraphError({ code: 2 }).retryable).toBe(true);
  });

  it("erro desconhecido mostra o detalhe", () => {
    expect(describeGraphError({ code: 999, message: "Algo aconteceu" }).message).toMatch(/Algo aconteceu/);
    expect(describeGraphError(null).message).toMatch(/recusou/);
  });
});

describe("agenda semanal", () => {
  it("começa na segunda-feira da semana de São Paulo", () => {
    expect(weekStartKey(null, now)).toBe("2026-10-12");
    // Domingo 23h em São Paulo já é segunda em UTC: continua na semana do domingo.
    expect(weekStartKey(null, new Date("2026-10-19T02:00:00Z"))).toBe("2026-10-12");
    expect(weekStartKey("2026-10-18", now)).toBe("2026-10-12");
    expect(weekStartKey("2026-02-30", now)).toBe("2026-10-12");
    expect(weekStartKey("", now)).toBe("2026-10-12");
  });

  it("navega entre semanas e lista os 7 dias", () => {
    expect(shiftWeek("2026-10-12", 1)).toBe("2026-10-19");
    expect(shiftWeek("2026-10-12", -2)).toBe("2026-09-28");
    const days = weekDays("2026-10-26");
    expect(days.map((d) => d.key)).toEqual(["2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31", "2026-11-01"]);
    expect(days[0]?.weekday).toBe("seg");
    expect(days[6]).toMatchObject({ weekday: "dom", day: 1, month: 11 });
  });

  it("agrupa por dia de São Paulo, em ordem de horário", () => {
    const posts = [
      { id: "b", publishedAt: null, scheduledAt: new Date("2026-10-17T14:30:00Z") },
      { id: "a", publishedAt: null, scheduledAt: new Date("2026-10-17T11:00:00Z") },
      { id: "c", publishedAt: new Date("2026-10-18T01:30:00Z"), scheduledAt: new Date("2026-10-18T01:00:00Z") }, // sábado 22h30
      { id: "d", publishedAt: null, scheduledAt: null },
    ];
    const map = groupByDay(posts);
    expect(map.get("2026-10-17")?.map((p) => p.id)).toEqual(["a", "b", "c"]);
    expect(map.size).toBe(1);
  });
});

describe("validação do formulário", () => {
  const valid = { format: "FEED", imagePath: "/midia/2026/10/abcdefabcdefabcdefabcdef.jpg", caption: " Fim de jogo \r\n", when: "SCHEDULE", scheduledAt: "2026-10-18T08:00" };

  it("aceita uma publicação de feed agendada e limpa a legenda", () => {
    const result = instagramPostSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.caption).toBe("Fim de jogo");
  });

  it("recusa imagem que não é JPEG, agendamento sem horário e story com legenda", () => {
    const png = instagramPostSchema.safeParse({ ...valid, imagePath: "/midia/2026/10/abcdefabcdefabcdefabcdef.png" });
    expect(png.success).toBe(false);
    const noDate = instagramPostSchema.safeParse({ ...valid, scheduledAt: "" });
    expect(noDate.success).toBe(false);
    const story = instagramPostSchema.safeParse({ ...valid, format: "STORY" });
    expect(story.success).toBe(false);
    const protocolRelative = instagramPostSchema.safeParse({ ...valid, imagePath: "//2026/10/abcdefabcdefabcdefabcdef.jpg" });
    expect(protocolRelative.success).toBe(false);
    const storyOk = instagramPostSchema.safeParse({ ...valid, format: "STORY", caption: "" });
    expect(storyOk.success).toBe(true);
  });
});

describe("cliente da Graph API", () => {
  const config: InstagramConfig = { host: "graph.instagram.com", version: "v25.0", userId: "1784", accessToken: "segredo", accountLabel: "@teste" };

  function fakeFetch(responses: { status?: number; body: unknown }[]) {
    const calls: { url: string; init?: RequestInit }[] = [];
    const impl = (async (url: URL | string, init?: RequestInit) => {
      calls.push({ url: String(url), init });
      const next = responses.shift() ?? { body: {} };
      return new Response(JSON.stringify(next.body), { status: next.status ?? 200, headers: { "content-type": "application/json" } });
    }) as typeof fetch;
    return { impl, calls };
  }

  it("lê a configuração do ambiente e recusa hosts desconhecidos", () => {
    expect(instagramConfig({ NODE_ENV: "test" })).toBeNull();
    expect(instagramConfig({ NODE_ENV: "test", INSTAGRAM_USER_ID: "1", INSTAGRAM_ACCESS_TOKEN: "t" })).toMatchObject({ host: "graph.instagram.com", version: "v25.0", accountLabel: "conta 1" });
    expect(instagramConfig({ NODE_ENV: "test", INSTAGRAM_USER_ID: "1", INSTAGRAM_ACCESS_TOKEN: "t", INSTAGRAM_API_HOST: "evil.example.com" })).toBeNull();
  });

  it("story vai com media_type STORIES e sem legenda; o token vai no corpo, não na URL", async () => {
    const { impl, calls } = fakeFetch([{ body: { id: "c1" } }]);
    const client = createInstagramClient(config, impl);
    await expect(client.createContainer({ format: "STORY", imageUrl: "https://x/a.jpg", caption: "ignorada" })).resolves.toBe("c1");
    expect(calls[0]?.url).toBe("https://graph.instagram.com/v25.0/1784/media");
    expect(calls[0]?.url).not.toContain("segredo");
    const body = new URLSearchParams(String(calls[0]?.init?.body));
    expect(body.get("media_type")).toBe("STORIES");
    expect(body.get("caption")).toBeNull();
    expect(body.get("access_token")).toBe("segredo");
  });

  it("feed leva a legenda; publicação usa creation_id", async () => {
    const { impl, calls } = fakeFetch([{ body: { id: "c2" } }, { body: { id: "m2" } }]);
    const client = createInstagramClient(config, impl);
    await client.createContainer({ format: "FEED", imageUrl: "https://x/a.jpg", caption: "Fim de jogo" });
    expect(new URLSearchParams(String(calls[0]?.init?.body)).get("caption")).toBe("Fim de jogo");
    await expect(client.publish("c2")).resolves.toBe("m2");
    expect(calls[1]?.url).toBe("https://graph.instagram.com/v25.0/1784/media_publish");
    expect(new URLSearchParams(String(calls[1]?.init?.body)).get("creation_id")).toBe("c2");
  });

  it("transforma o erro da API em mensagem e diz se dá para repetir", async () => {
    const { impl } = fakeFetch([{ status: 400, body: { error: { code: 190, message: "expired" } } }]);
    const client = createInstagramClient(config, impl);
    const error = await client.createContainer({ format: "FEED", imageUrl: "https://x/a.jpg", caption: null }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(InstagramApiError);
    expect((error as InstagramApiError).retryable).toBe(false);

    const server = fakeFetch([{ status: 503, body: {} }]);
    const failing = createInstagramClient(config, server.impl);
    const temporary = await failing.publish("c").catch((e: unknown) => e);
    expect((temporary as InstagramApiError).retryable).toBe(true);
  });
});

describe("diagnóstico das falhas", () => {
  it("sempre mostra o texto original do Instagram e os códigos", () => {
    const info = describeGraphError({ code: 9004, error_subcode: 2207052, message: "Media download has failed.", error_user_msg: "The media could not be fetched from this uri" });
    expect(info.message).toMatch(/baixar a imagem/);
    expect(info.message).toContain("The media could not be fetched from this uri");
    expect(info.message).toContain("(código 9004/2207052)");
  });

  it("código 9004 genérico não afirma que foi o download", () => {
    const info = describeGraphError({ code: 9004, message: "Only photo or video can be accepted as media type." });
    expect(info.message).not.toMatch(/baixar/);
    expect(info.message).toContain("Only photo or video");
  });

  it("proporção, tamanho e formato têm mensagens próprias", () => {
    expect(describeGraphError({ code: 36003, error_subcode: 2207009 }).message).toMatch(/Proporção/);
    expect(describeGraphError({ code: 9004, error_subcode: 2207004 }).message).toMatch(/8 MB/);
    expect(describeGraphError({ code: 9004, error_subcode: 2207005 }).message).toMatch(/JPEG/);
  });
});

describe("proporção da imagem", () => {
  it("feed recusa imagem vertical de story e aceita 4:5, quadrada e 1,91:1", () => {
    expect(checkAspectRatio("FEED", 736, 1308)?.level).toBe("error");
    expect(checkAspectRatio("FEED", 1080, 1350)).toBeNull();
    expect(checkAspectRatio("FEED", 1080, 1080)).toBeNull();
    expect(checkAspectRatio("FEED", 1080, 566)).toBeNull();
    expect(checkAspectRatio("FEED", 1920, 800)?.message).toMatch(/larga demais/);
  });

  it("story só avisa quando não é 9:16", () => {
    expect(checkAspectRatio("STORY", 736, 1308)).toBeNull();
    expect(checkAspectRatio("STORY", 1080, 1920)).toBeNull();
    expect(checkAspectRatio("STORY", 1080, 1080)?.level).toBe("warning");
    expect(checkAspectRatio("STORY", 0, 0)).toBeNull();
  });
});

describe("situação do contêiner", () => {
  it("traz o motivo do erro dado pelo Instagram", async () => {
    const impl = (async () =>
      new Response(JSON.stringify({ status_code: "ERROR", status: "Error: Media ID is not available" }), { status: 200 })) as unknown as typeof fetch;
    const client = createInstagramClient({ host: "graph.instagram.com", version: "v25.0", userId: "1", accessToken: "t", accountLabel: "@t" }, impl);
    await expect(client.containerStatus("c")).resolves.toEqual({ code: "ERROR", detail: "Error: Media ID is not available" });
  });
});

describe("agendador interno", () => {
  it("liga sozinho no servidor próprio e fica desligado na Vercel e nos testes", () => {
    expect(internalSchedulerEnabled({ NODE_ENV: "development" })).toBe(true);
    expect(internalSchedulerEnabled({ NODE_ENV: "production" })).toBe(true);
    expect(internalSchedulerEnabled({ NODE_ENV: "production", VERCEL: "1" })).toBe(false);
    expect(internalSchedulerEnabled({ NODE_ENV: "test" })).toBe(false);
  });

  it("pode ser forçado pela variável INSTAGRAM_SCHEDULER", () => {
    expect(internalSchedulerEnabled({ NODE_ENV: "development", INSTAGRAM_SCHEDULER: "externo" })).toBe(false);
    expect(internalSchedulerEnabled({ NODE_ENV: "production", VERCEL: "1", INSTAGRAM_SCHEDULER: "interno" })).toBe(true);
  });
});
