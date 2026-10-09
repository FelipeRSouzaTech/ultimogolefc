import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

/** Verificação de saúde para monitoramento: confirma que a aplicação alcança o banco. */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok" });
  } catch {
    return NextResponse.json({ status: "error", message: "Banco de dados indisponível." }, { status: 503 });
  }
}
