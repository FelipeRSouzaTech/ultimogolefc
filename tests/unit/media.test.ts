import { describe, expect, it } from "vitest";
import { can } from "@/lib/auth/permissions";
import { EMPTY_SHA256, sha256Hex, signRequest } from "@/lib/storage/sigv4";
import { galleryImageSchema, gallerySchema } from "@/lib/validation/site";
import { isGalleryCategory, neighborIndex, nextSortOrder } from "@/modules/gallery/rules";
import { buildKey, detectImageType, inspectImage, isUploadedPath, isValidKey, keyToPath, MAX_IMAGE_BYTES, mimeFromKey, pathToKey } from "@/modules/media/rules";

const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]);
const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46]);
const webp = new Uint8Array([0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50]);
const text = new TextEncoder().encode("<svg onload=alert(1)></svg>");

describe("validação de imagens enviadas", () => {
  it("identifica o tipo real pelos bytes", () => {
    expect(detectImageType(png)).toBe("image/png");
    expect(detectImageType(jpeg)).toBe("image/jpeg");
    expect(detectImageType(webp)).toBe("image/webp");
    expect(detectImageType(text)).toBeNull();
    expect(detectImageType(new Uint8Array([]))).toBeNull();
  });

  it("aceita PNG, JPG e WebP com extensão coerente", () => {
    expect(inspectImage(png, "foto.PNG")).toEqual({ ok: true, mime: "image/png", extension: "png" });
    expect(inspectImage(jpeg, "foto.jpeg")).toEqual({ ok: true, mime: "image/jpeg", extension: "jpg" });
    expect(inspectImage(webp, "foto.webp")).toEqual({ ok: true, mime: "image/webp", extension: "webp" });
  });

  it("recusa arquivo vazio, grande demais, extensão não aceita e conteúdo disfarçado", () => {
    expect(inspectImage(new Uint8Array([]), "a.png").ok).toBe(false);
    expect(inspectImage(new Uint8Array(MAX_IMAGE_BYTES + 1), "a.png").ok).toBe(false);
    expect(inspectImage(text, "imagem.svg").ok).toBe(false);
    expect(inspectImage(png, "imagem.gif").ok).toBe(false);
    expect(inspectImage(png, "sem-extensao").ok).toBe(false);
    // Script renomeado para .png e imagem com extensão trocada.
    expect(inspectImage(text, "malicioso.png").ok).toBe(false);
    expect(inspectImage(png, "trocada.jpg").ok).toBe(false);
  });
});

describe("chaves e caminhos de mídia", () => {
  const key = buildKey("0123456789abcdef01234567", "jpg", new Date("2026-10-09T12:00:00Z"));

  it("gera chave por ano e mês e converte para caminho público", () => {
    expect(key).toBe("2026/10/0123456789abcdef01234567.jpg");
    expect(isValidKey(key)).toBe(true);
    expect(keyToPath(key)).toBe("/midia/2026/10/0123456789abcdef01234567.jpg");
    expect(pathToKey(keyToPath(key))).toBe(key);
    expect(mimeFromKey(key)).toBe("image/jpeg");
  });

  it("recusa chaves fora do padrão, inclusive tentativas de sair da pasta", () => {
    expect(isValidKey("../../etc/passwd")).toBe(false);
    expect(isValidKey("2026/10/../../segredo.png")).toBe(false);
    expect(isValidKey("2026/10/0123456789abcdef01234567.svg")).toBe(false);
    expect(isValidKey("2026/10/0123456789ABCDEF01234567.png")).toBe(false);
    expect(isValidKey("")).toBe(false);
  });

  it("distingue imagens enviadas de arquivos estáticos", () => {
    expect(isUploadedPath(keyToPath(key))).toBe(true);
    expect(isUploadedPath("/brand/escudo.png")).toBe(false);
    expect(isUploadedPath("/midia/../x.png")).toBe(false);
    expect(isUploadedPath(null)).toBe(false);
    expect(pathToKey("/brand/escudo.png")).toBeNull();
  });
});

describe("assinatura S3 (AWS Signature V4)", () => {
  // Vetor oficial da documentação da AWS ("Example: GET Object").
  it("reproduz a assinatura do exemplo oficial da AWS", () => {
    const headers = signRequest({
      method: "GET",
      url: new URL("https://examplebucket.s3.amazonaws.com/test.txt"),
      headers: { Range: "bytes=0-9" },
      payloadHash: EMPTY_SHA256,
      accessKeyId: "AKIAIOSFODNN7EXAMPLE",
      secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
      region: "us-east-1",
      date: new Date("2013-05-24T00:00:00Z"),
    });
    expect(headers["x-amz-date"]).toBe("20130524T000000Z");
    expect(headers.authorization).toBe(
      "AWS4-HMAC-SHA256 Credential=AKIAIOSFODNN7EXAMPLE/20130524/us-east-1/s3/aws4_request,SignedHeaders=host;range;x-amz-content-sha256;x-amz-date,Signature=f0e8bdb87c964420e857bd35b5d6ed310bd44f0170aba48dd91039c6036bdb41",
    );
  });

  it("calcula o hash do conteúdo vazio", () => {
    expect(sha256Hex("")).toBe(EMPTY_SHA256);
  });
});

describe("permissão de envio de imagens", () => {
  it("quem edita conteúdo ou futebol pode enviar; consulta não", () => {
    expect(can("EDITOR", "media:upload")).toBe(true);
    expect(can("FOOTBALL_MANAGER", "media:upload")).toBe(true);
    expect(can("ADMIN", "media:upload")).toBe(true);
    expect(can("VIEWER", "media:upload")).toBe(false);
  });
});

describe("galeria", () => {
  it("navega em círculo entre as fotos", () => {
    expect(neighborIndex(0, 3, 1)).toBe(1);
    expect(neighborIndex(2, 3, 1)).toBe(0);
    expect(neighborIndex(0, 3, -1)).toBe(2);
    expect(neighborIndex(0, 1, 1)).toBe(0);
    expect(neighborIndex(0, 0, 1)).toBe(0);
  });

  it("coloca a nova foto no fim do álbum", () => {
    expect(nextSortOrder([])).toBe(0);
    expect(nextSortOrder([0, 1, 2])).toBe(3);
    expect(nextSortOrder([5, 2])).toBe(6);
  });

  it("valida categoria, álbum e exige texto alternativo nas fotos", () => {
    expect(isGalleryCategory("FANS")).toBe(true);
    expect(isGalleryCategory("OUTRA")).toBe(false);
    const album = { title: "Final do campeonato", description: "", category: "MATCH", eventDate: "2026-10-09", isPublished: false };
    expect(gallerySchema.safeParse(album).success).toBe(true);
    expect(gallerySchema.safeParse({ ...album, category: "OUTRA" }).success).toBe(false);
    expect(gallerySchema.safeParse({ ...album, eventDate: "09/10/2026" }).success).toBe(false);
    expect(galleryImageSchema.safeParse({ altText: "Time posado antes do jogo", caption: "", sortOrder: "0" }).success).toBe(true);
    expect(galleryImageSchema.safeParse({ altText: "", caption: "", sortOrder: "0" }).success).toBe(false);
  });
});
