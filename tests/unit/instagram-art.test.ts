import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { renderCallArt, renderLineupArt, renderNewsArt, renderResultArt } from "@/lib/instagram/art";

// Desenha as artes de verdade (next/og + sharp) para garantir que saem em JPEG, no tamanho que o Instagram aceita.
async function expectJpeg(bytes: Buffer, width: number, height: number) {
  expect(bytes.subarray(0, 3)).toEqual(Buffer.from([0xff, 0xd8, 0xff]));
  const meta = await sharp(bytes).metadata();
  expect(meta.format).toBe("jpeg");
  expect(meta.width).toBe(width);
  expect(meta.height).toBe(height);
}

describe("artes automáticas", { timeout: 60_000 }, () => {
  it("resultado em feed (1080 × 1350) e story (1080 × 1920)", async () => {
    const base = {
      siteName: "Último Gole FC",
      competition: "Campeonato de Verão",
      round: "6ª rodada",
      category: "Principal / Adulto",
      outcome: "Vitória",
      home: { name: "Último Gole", crest: null, score: 3 },
      away: { name: "Adversário FC", crest: null, score: 1 },
      scorers: "Rafa 2, Dudu",
    };
    await expectJpeg(await renderResultArt({ ...base, format: "FEED" }), 1080, 1350);
    await expectJpeg(await renderResultArt({ ...base, format: "STORY" }), 1080, 1920);
  });

  it("chamada, escalação e notícia", async () => {
    await expectJpeg(
      await renderCallArt({ siteName: "Último Gole FC", headline: "Amanhã tem jogo", ownCrest: null, opponent: { name: "Time Y", crest: null }, when: "dom 18/10 · 9h", venue: "Campo Municipal", competition: "Campeonato de Verão" }),
      1080,
      1920,
    );
    await expectJpeg(
      await renderLineupArt({ siteName: "Último Gole FC", opponent: "Time Y", when: "dom 18/10 · 9h", starters: [{ number: 1, name: "Goleiro" }, { number: null, name: "Zagueiro" }], hiddenStarters: 2, substitutes: ["Reserva"] }),
      1080,
      1920,
    );
    await expectJpeg(await renderNewsArt({ siteName: "Último Gole FC", title: "Gol de falta decide a vitória sobre o Adversário FC", category: "Futebol", cover: null }), 1080, 1350);
  });
});
