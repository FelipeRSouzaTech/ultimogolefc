import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { runDuePosts } from "@/modules/instagram/service";

export const dynamic = "force-dynamic";
// Cada publicação leva alguns segundos (criação do contêiner + processamento + publicação).
export const maxDuration = 60;

/** Compara o cabeçalho "Authorization: Bearer <CRON_SECRET>" em tempo constante. */
function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16) return false;
  const header = request.headers.get("authorization") ?? "";
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(header);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

/**
 * Agendador das publicações do Instagram. Deve ser chamado a cada 5 minutos por um serviço externo
 * (cron-job.org, Supabase pg_cron, Vercel Cron…), sempre com o cabeçalho Authorization. Ver docs/INSTAGRAM.md.
 */
async function handle(request: Request) {
  if (!process.env.CRON_SECRET) return NextResponse.json({ error: "Agendador desativado: defina CRON_SECRET." }, { status: 503 });
  if (!authorized(request)) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const summary = await runDuePosts();
  return NextResponse.json(summary, { headers: { "Cache-Control": "no-store" } });
}

export const GET = handle;
export const POST = handle;
