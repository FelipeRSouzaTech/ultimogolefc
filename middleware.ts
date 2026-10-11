import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "ug_session";

// Primeira barreira: sem cookie de sessão, nem chega ao painel nem ao portal financeiro.
// A validação real da sessão e das permissões é feita no servidor, em cada página e em cada operação.
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/admin/login" || pathname === "/financeiro/login") return NextResponse.next();
  if (!request.cookies.has(SESSION_COOKIE)) {
    // Cada portal tem a própria tela de entrada.
    const login = pathname === "/financeiro" || pathname.startsWith("/financeiro/") ? "/financeiro/login" : "/admin/login";
    return NextResponse.redirect(new URL(login, request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/financeiro/:path*"],
};
