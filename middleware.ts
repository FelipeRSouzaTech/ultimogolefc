import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "ug_session";

// Primeira barreira: sem cookie de sessão, nem chega ao painel.
// A validação real da sessão e das permissões é feita no servidor, em cada página e em cada operação.
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/admin/login") return NextResponse.next();
  if (!request.cookies.has(SESSION_COOKIE)) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
