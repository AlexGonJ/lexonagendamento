import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get("session_token");
  const { pathname } = request.nextUrl;

  // Se o usuário tentar acessar qualquer rota admin sem estar logado, vai para o login
  if (pathname.startsWith("/admin") && !sessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Se o usuário tentar acessar a tela de login já estando logado, vai para o painel
  if (pathname.startsWith("/login") && sessionCookie) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/login"],
};
