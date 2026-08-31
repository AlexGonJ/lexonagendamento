import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySignedToken, createSignedToken } from "@/lib/session";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get("session_token");
  const superAdminCookie = request.cookies.get("super_admin_token");

  // ── Redirecionamentos de Segurança (Antigo proxy.ts) ───────────────────
  if (pathname.startsWith("/super-admin") && !pathname.startsWith("/super-admin/login")) {
    if (!superAdminCookie?.value) {
      return NextResponse.redirect(new URL("/super-admin/login", request.url));
    }
  }

  if (pathname.startsWith("/admin") && !sessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  let response = NextResponse.next();

  // ── Sliding Sessions (Renovação de Tokens) ─────────────────────────────
  
  // Employee sliding session (1 day)
  if (sessionCookie?.value) {
    const session = await verifySignedToken(sessionCookie.value, "employee-session");
    if (session) {
      const newToken = await createSignedToken("employee-session", session, 60 * 60 * 24);
      response.cookies.set({
        name: "session_token",
        value: newToken,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24, // 1 dia
        path: "/",
      });
    }
  }

  // Client sliding session (30 dias)
  const clientCookie = request.cookies.get("client_token");
  if (clientCookie?.value) {
    const session = await verifySignedToken(clientCookie.value, "client-session");
    if (session) {
      const newToken = await createSignedToken("client-session", session, 60 * 60 * 24 * 30);
      response.cookies.set({
        name: "client_token",
        value: newToken,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30, // 30 dias
        path: "/",
      });
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
