import { describe, expect, it } from "vitest";
import { isPubliclyVisible, parseContent, publicationLabel, resolvePublishedAt } from "@/modules/news/rules";
import { newsSchema } from "@/lib/validation/news";

const now = new Date("2026-10-09T15:00:00Z");
const past = new Date("2026-10-01T12:00:00Z");
const future = new Date("2026-11-01T12:00:00Z");

describe("visibilidade pública de notícias", () => {
  it("mostra somente notícias publicadas com data já alcançada", () => {
    expect(isPubliclyVisible({ status: "PUBLISHED", publishedAt: past }, now)).toBe(true);
    expect(isPubliclyVisible({ status: "PUBLISHED", publishedAt: now }, now)).toBe(true);
  });

  it("oculta rascunhos, arquivadas, agendadas e publicadas sem data", () => {
    expect(isPubliclyVisible({ status: "DRAFT", publishedAt: past }, now)).toBe(false);
    expect(isPubliclyVisible({ status: "ARCHIVED", publishedAt: past }, now)).toBe(false);
    expect(isPubliclyVisible({ status: "PUBLISHED", publishedAt: future }, now)).toBe(false);
    expect(isPubliclyVisible({ status: "PUBLISHED", publishedAt: null }, now)).toBe(false);
  });

  it("rotula publicações futuras como agendadas", () => {
    expect(publicationLabel({ status: "PUBLISHED", publishedAt: future }, now)).toBe("Agendada");
    expect(publicationLabel({ status: "PUBLISHED", publishedAt: past }, now)).toBe("Publicada");
    expect(publicationLabel({ status: "DRAFT", publishedAt: null }, now)).toBe("Rascunho");
  });
});

describe("resolvePublishedAt", () => {
  it("rascunho fica sem data de publicação", () => {
    expect(resolvePublishedAt("DRAFT", past, past, now)).toBeNull();
  });

  it("publicação usa a data informada, depois a anterior, depois o momento atual", () => {
    expect(resolvePublishedAt("PUBLISHED", future, past, now)).toEqual(future);
    expect(resolvePublishedAt("PUBLISHED", null, past, now)).toEqual(past);
    expect(resolvePublishedAt("PUBLISHED", null, null, now)).toEqual(now);
  });

  it("arquivamento preserva a data anterior", () => {
    expect(resolvePublishedAt("ARCHIVED", future, past, now)).toEqual(past);
  });
});

describe("parseContent", () => {
  it("separa parágrafos e subtítulos", () => {
    expect(parseContent("Primeiro.\n\n## Subtítulo\n\nSegundo\ncontinua.\r\n\r\n\r\nTerceiro.")).toEqual([
      { type: "paragraph", text: "Primeiro." },
      { type: "heading", text: "Subtítulo" },
      { type: "paragraph", text: "Segundo\ncontinua." },
      { type: "paragraph", text: "Terceiro." },
    ]);
  });

  it("mantém marcação HTML como texto, sem interpretá-la", () => {
    const blocks = parseContent('<script>alert("x")</script>');
    expect(blocks).toEqual([{ type: "paragraph", text: '<script>alert("x")</script>' }]);
  });

  it("devolve lista vazia para conteúdo em branco", () => {
    expect(parseContent("  \n\n  ")).toEqual([]);
  });
});

describe("newsSchema", () => {
  const valid = {
    title: "Título da notícia",
    slug: "",
    summary: "Resumo com tamanho suficiente.",
    content: "Conteúdo com tamanho suficiente para passar.",
    categoryId: "",
    authorName: "",
    coverPath: "",
    seoTitle: "",
    seoDescription: "",
    status: "DRAFT",
    publishedAt: "",
  };

  it("aceita dados válidos e converte campos vazios em null", () => {
    const parsed = newsSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.categoryId).toBeNull();
      expect(parsed.data.seoTitle).toBeNull();
    }
  });

  it("recusa título curto, slug inválido e estado desconhecido", () => {
    expect(newsSchema.safeParse({ ...valid, title: "Oi" }).success).toBe(false);
    expect(newsSchema.safeParse({ ...valid, slug: "Com Espaço" }).success).toBe(false);
    expect(newsSchema.safeParse({ ...valid, status: "APAGADA" }).success).toBe(false);
  });
});
