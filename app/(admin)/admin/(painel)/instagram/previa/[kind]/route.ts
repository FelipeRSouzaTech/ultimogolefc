import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/guard";
import { can } from "@/lib/auth/permissions";
import { isAutomationKind } from "@/modules/instagram/automations";
import { previewArt } from "@/modules/instagram/automation-service";

export const dynamic = "force-dynamic";

/**
 * Prévia da arte de uma automação (/admin/instagram/previa/MATCH_RESULT?formato=STORY), montada com os dados
 * reais mais recentes. Não cria publicação nem grava arquivo.
 */
export async function GET(request: Request, { params }: { params: Promise<{ kind: string }> }) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, "content:read")) return new NextResponse("Não autorizado.", { status: 401 });
  const { kind } = await params;
  if (!isAutomationKind(kind)) return new NextResponse("Automação desconhecida.", { status: 404 });
  const format = new URL(request.url).searchParams.get("formato") === "STORY" ? "STORY" : "FEED";
  try {
    const jpeg = await previewArt(kind, kind === "MATCH_CALL" || kind === "MATCH_LINEUP" ? "STORY" : kind === "NEWS_PUBLISHED" ? "FEED" : format);
    if (!jpeg) {
      return new NextResponse("Ainda não há dados para esta arte: cadastre um jogo (encerrado para o resultado, futuro para a chamada e a escalação) ou publique uma notícia.", {
        status: 404,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }
    return new NextResponse(new Uint8Array(jpeg), { headers: { "Content-Type": "image/jpeg", "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[instagram] prévia da arte falhou", error);
    return new NextResponse("Não foi possível gerar a arte. Veja o log do servidor.", { status: 500, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
}
