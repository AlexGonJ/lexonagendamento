import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const sessionCookie = request.cookies.get("session_token");
  const superAdminCookie = request.cookies.get("super_admin_token");
  const { pathname } = request.nextUrl;

  // ── Super Admin protection ──────────────────────────────────────────────
  // Note: only check cookie presence here; value validation happens in the
  // layout server component (which has full Node.js env access).
  if (pathname.startsWith("/super-admin") && !pathname.startsWith("/super-admin/login")) {
    if (!superAdminCookie?.value) {
      return NextResponse.redirect(new URL("/super-admin/login", request.url));
    }
  }
  // Note: we intentionally do NOT redirect /super-admin/login when cookie exists,
  // because the cookie value may be stale/invalid. The login page handles this case.

  // ── Admin (tenant) protection ───────────────────────────────────────────
  if (pathname.startsWith("/admin") && !sessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (pathname.startsWith("/login") && sessionCookie) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/login", "/super-admin/:path*"],
};