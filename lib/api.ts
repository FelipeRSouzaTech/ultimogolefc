import { NextResponse } from "next/server";

/** Envelope padrão das respostas da API pública (somente leitura). */
export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ data }, init);
}

export function fail(status: number, message: string) {
  return NextResponse.json({ error: { message } }, { status });
}

export function serverError(error: unknown) {
  console.error("[api] falha inesperada", error);
  return fail(500, "Erro interno.");
}
