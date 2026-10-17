import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { createElement, type CSSProperties, type ReactElement, type ReactNode } from "react";
import { ImageResponse } from "next/og";
import type { InstagramFormat } from "@/modules/instagram/rules";

/**
 * Artes automáticas do Instagram, desenhadas com next/og (Satori) e convertidas para JPEG com sharp,
 * porque a API do Instagram só aceita JPEG. Visual dos mockups aprovados: azul-marinho, branco, Montserrat.
 *
 * Regras do Satori que valem aqui: todo elemento com mais de um filho usa display flex; imagens precisam de
 * largura e altura; nada de CSS que o Satori não conhece (grid, calc complexos).
 */

export const ART_SIZE: Record<InstagramFormat, { width: number; height: number }> = {
  FEED: { width: 1080, height: 1350 },
  STORY: { width: 1080, height: 1920 },
};

const NAVY = "#0F2145";
const WHITE = "#FFFFFF";
const MUTED = "#C9D1E0";
const LINE = "#2F4370";
const INK = "#000000";
const GRAY = "#4B5563";

type Style = CSSProperties;

function h(tag: string, style: Style, ...children: ReactNode[]): ReactElement {
  return createElement(tag, { style: { display: "flex", ...style } }, ...children);
}

function img(src: string, size: number): ReactElement {
  return createElement("img", { src, width: size, height: size, style: { width: size, height: size, objectFit: "contain" } });
}

// --- Fontes ---------------------------------------------------------------------------------------

let fontCache: Promise<{ name: string; data: ArrayBuffer; weight: 500 | 800; style: "normal" }[]> | null = null;

/** Montserrat em pesos fixos (500 e 800), gerados a partir da fonte variável do site (OFL, ver lib/instagram/fonts). */
function fonts() {
  fontCache ??= Promise.all(
    ([500, 800] as const).map(async (weight) => {
      const file = await readFile(path.join(process.cwd(), "lib/instagram/fonts", `montserrat-${weight}.woff`));
      const data = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer;
      return { name: "Montserrat", data, weight, style: "normal" as const };
    }),
  );
  return fontCache;
}

// --- Conversão ------------------------------------------------------------------------------------

/** Converte qualquer imagem (PNG, JPEG, WebP, SVG) para PNG em data URI, o formato que o Satori desenha. */
export async function toPngDataUri(bytes: Uint8Array, maxSize = 1080): Promise<string | null> {
  try {
    const { default: sharp } = await import("sharp");
    const png = await sharp(bytes).resize({ width: maxSize, height: maxSize, fit: "inside", withoutEnlargement: true }).png().toBuffer();
    return `data:image/png;base64,${png.toString("base64")}`;
  } catch {
    return null;
  }
}

async function renderJpeg(element: ReactElement, format: InstagramFormat): Promise<Buffer> {
  const { width, height } = ART_SIZE[format];
  const response = new ImageResponse(element, { width, height, fonts: await fonts() });
  const png = Buffer.from(await response.arrayBuffer());
  const { default: sharp } = await import("sharp");
  return sharp(png).flatten({ background: WHITE }).jpeg({ quality: 90, mozjpeg: true }).toBuffer();
}

// --- Peças comuns ---------------------------------------------------------------------------------

function crest(src: string | null, size: number, fallback: string): ReactElement {
  if (src) return img(src, size);
  return h(
    "div",
    { width: size, height: size, borderRadius: size, border: `4px solid ${MUTED}`, alignItems: "center", justifyContent: "center", fontSize: size * 0.32, fontWeight: 800, color: MUTED },
    fallback.slice(0, 2).toUpperCase(),
  );
}

function footer(siteName: string, color: string, extra?: string): ReactElement {
  return h(
    "div",
    { justifyContent: "space-between", alignItems: "center", borderTop: `2px solid ${color === WHITE ? LINE : "#D9DCE1"}`, paddingTop: 28, fontSize: 30, fontWeight: 500, color: color === WHITE ? MUTED : GRAY },
    h("div", {}, extra ?? ""),
    h("div", { fontWeight: 800, color, textTransform: "uppercase", letterSpacing: 1 }, siteName),
  );
}

// --- Resultado ------------------------------------------------------------------------------------

export type ResultArt = {
  format: InstagramFormat;
  siteName: string;
  competition: string | null;
  round: string | null;
  category: string | null;
  outcome: string;
  home: { name: string; crest: string | null; score: number };
  away: { name: string; crest: string | null; score: number };
  scorers: string;
};

export async function renderResultArt(art: ResultArt): Promise<Buffer> {
  const story = art.format === "STORY";
  const team = (side: ResultArt["home"]) =>
    h(
      "div",
      { flexDirection: "column", alignItems: "center", gap: 20, width: 380 },
      crest(side.crest, story ? 200 : 170, side.name),
      h("div", { fontSize: story ? 40 : 36, fontWeight: 800, textTransform: "uppercase", textAlign: "center", justifyContent: "center", lineHeight: 1.1 }, side.name),
    );

  const meta = [art.competition, art.round].filter(Boolean).join(" · ");
  const element = h(
    "div",
    { width: "100%", height: "100%", flexDirection: "column", justifyContent: "space-between", backgroundColor: NAVY, color: WHITE, fontFamily: "Montserrat", padding: story ? "150px 80px 130px" : "80px 80px 70px" },
    h(
      "div",
      { justifyContent: "space-between", fontSize: 30, fontWeight: 500, color: MUTED },
      h("div", {}, meta || " "),
      h("div", {}, art.category ?? ""),
    ),
    h(
      "div",
      { flexDirection: "column", alignItems: "center", gap: story ? 70 : 44 },
      h("div", { fontSize: story ? 60 : 52, fontWeight: 800, textTransform: "uppercase", letterSpacing: 4 }, "Fim de jogo"),
      h("div", { fontSize: story ? 300 : 250, fontWeight: 800, lineHeight: 1 }, `${art.home.score} × ${art.away.score}`),
      h("div", { justifyContent: "space-between", width: "100%", alignItems: "flex-start" }, team(art.home), team(art.away)),
      h("div", { fontSize: 34, fontWeight: 800, color: MUTED, textTransform: "uppercase", letterSpacing: 3 }, art.outcome),
    ),
    footer(art.siteName, WHITE, art.scorers ? `Gols: ${art.scorers}` : undefined),
  );
  return renderJpeg(element, art.format);
}

// --- Chamada do jogo (story) ----------------------------------------------------------------------

export type CallArt = {
  siteName: string;
  headline: string;
  ownCrest: string | null;
  opponent: { name: string; crest: string | null };
  when: string;
  venue: string | null;
  competition: string | null;
};

export async function renderCallArt(art: CallArt): Promise<Buffer> {
  const element = h(
    "div",
    { width: "100%", height: "100%", flexDirection: "column", justifyContent: "space-between", backgroundColor: WHITE, color: NAVY, fontFamily: "Montserrat", padding: "160px 90px 130px" },
    h("div", { alignItems: "center", gap: 30 }, crest(art.ownCrest, 150, art.siteName), h("div", { fontSize: 40, fontWeight: 800, color: INK, textTransform: "uppercase" }, art.headline)),
    h(
      "div",
      { flexDirection: "column", gap: 40 },
      h("div", { fontSize: 44, fontWeight: 500, color: GRAY }, "contra"),
      h("div", { alignItems: "center", gap: 40 }, crest(art.opponent.crest, 180, art.opponent.name), h("div", { fontSize: 96, fontWeight: 800, lineHeight: 1, textTransform: "uppercase", maxWidth: 680 }, art.opponent.name)),
      h(
        "div",
        { flexDirection: "column", gap: 14, borderTop: `6px solid ${NAVY}`, paddingTop: 36, marginTop: 30 },
        h("div", { fontSize: 104, fontWeight: 800, textTransform: "uppercase", lineHeight: 1 }, art.when),
        h("div", { fontSize: 44, fontWeight: 500, color: INK }, art.venue ?? "Local a confirmar"),
      ),
    ),
    footer(art.siteName, NAVY, art.competition ?? undefined),
  );
  return renderJpeg(element, "STORY");
}

// --- Escalação (story) ----------------------------------------------------------------------------

export type LineupArt = {
  siteName: string;
  opponent: string;
  when: string;
  starters: { number: number | null; name: string }[];
  hiddenStarters: number;
  substitutes: string[];
};

export async function renderLineupArt(art: LineupArt): Promise<Buffer> {
  const rows = art.starters.map((player) =>
    h(
      "div",
      { alignItems: "center", gap: 30, borderBottom: `2px solid ${LINE}`, paddingBottom: 18 },
      h("div", { width: 90, fontSize: 48, fontWeight: 800, color: MUTED, justifyContent: "flex-end" }, player.number === null ? "–" : String(player.number)),
      h("div", { fontSize: 52, fontWeight: 800, textTransform: "uppercase" }, player.name),
    ),
  );
  if (art.hiddenStarters > 0) {
    rows.push(h("div", { fontSize: 34, fontWeight: 500, color: MUTED, paddingLeft: 120 }, `+ ${art.hiddenStarters} ${art.hiddenStarters === 1 ? "atleta" : "atletas"}`));
  }
  const element = h(
    "div",
    { width: "100%", height: "100%", flexDirection: "column", justifyContent: "space-between", backgroundColor: NAVY, color: WHITE, fontFamily: "Montserrat", padding: "150px 80px 120px" },
    h(
      "div",
      { flexDirection: "column", gap: 16 },
      h("div", { fontSize: 110, fontWeight: 800, textTransform: "uppercase", lineHeight: 1 }, "Escalação"),
      h("div", { fontSize: 40, fontWeight: 500, color: MUTED }, `contra ${art.opponent} · ${art.when}`),
    ),
    h("div", { flexDirection: "column", gap: 18 }, ...rows),
    h(
      "div",
      { flexDirection: "column", gap: 28 },
      art.substitutes.length > 0 ? h("div", { fontSize: 30, fontWeight: 500, color: MUTED, lineHeight: 1.4 }, `Reservas: ${art.substitutes.join(", ")}`) : h("div", {}, ""),
      footer(art.siteName, WHITE),
    ),
  );
  return renderJpeg(element, "STORY");
}

// --- Notícia (feed) -------------------------------------------------------------------------------

export type NewsArt = { siteName: string; title: string; category: string | null; cover: string | null };

export async function renderNewsArt(art: NewsArt): Promise<Buffer> {
  const titleSize = art.title.length > 90 ? 58 : art.title.length > 60 ? 68 : 80;
  const element = h(
    "div",
    { width: "100%", height: "100%", flexDirection: "column", backgroundColor: NAVY, color: WHITE, fontFamily: "Montserrat" },
    art.cover
      ? createElement("img", { src: art.cover, width: 1080, height: 720, style: { width: 1080, height: 720, objectFit: "cover" } })
      : h("div", { width: 1080, height: 720, backgroundColor: LINE, alignItems: "center", justifyContent: "center", fontSize: 60, fontWeight: 800, color: MUTED, textTransform: "uppercase" }, art.siteName),
    h(
      "div",
      { flexDirection: "column", justifyContent: "space-between", flexGrow: 1, padding: "56px 80px 64px" },
      h(
        "div",
        { flexDirection: "column", gap: 24 },
        h("div", { fontSize: 30, fontWeight: 800, color: MUTED, textTransform: "uppercase", letterSpacing: 3 }, art.category ?? "Notícia"),
        h("div", { fontSize: titleSize, fontWeight: 800, lineHeight: 1.1 }, art.title),
      ),
      footer(art.siteName, WHITE, "Leia no site"),
    ),
  );
  return renderJpeg(element, "FEED");
}
