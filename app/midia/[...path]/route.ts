import { NextResponse } from "next/server";
import { readLocal, s3PublicUrl } from "@/lib/storage";
import { isValidKey, mimeFromKey } from "@/modules/media/rules";

export const dynamic = "force-dynamic";

/**
 * Entrega as imagens enviadas pelo painel em /midia/<chave>.
 * Driver local: lê da pasta de armazenamento. Driver S3: redireciona para o endereço público do bucket.
 * As chaves são aleatórias e nunca reutilizadas, por isso a resposta pode ficar em cache por muito tempo.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const key = (await params).path.join("/");
  const mime = mimeFromKey(key);
  if (!isValidKey(key) || !mime) return new NextResponse("Não encontrado", { status: 404 });

  const remote = s3PublicUrl(key);
  if (remote) return NextResponse.redirect(remote, 308);

  const bytes = await readLocal(key);
  if (!bytes) return new NextResponse("Não encontrado", { status: 404 });
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": mime,
      "Content-Length": String(bytes.length),
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'",
    },
  });
}
