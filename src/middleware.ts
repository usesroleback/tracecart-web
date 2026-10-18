import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, decodeToken } from "./lib/session";

const ROLE_HOME: Record<string, string> = {
  SUPER_ADMIN: "/orders",
  LOGISTICS_PARTNER: "/deliveries",
};

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Public surfaces — no session, no login redirect. "/" is the public
  // marketing site (TraceCartSite); the authenticated console lives at
  // /dashboard and the other admin/partner paths below.
  if (pathname === "/" || pathname.startsWith("/q/")) {
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? decodeToken(token) : null;

  if (pathname === "/login") {
    if (session) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  if (!session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const adminOnlyPaths = ["/orders", "/products", "/stores", "/hub-setup", "/reservations"];
  if (adminOnlyPaths.some((p) => pathname.startsWith(p)) && session.role !== "SUPER_ADMIN") {
    return NextResponse.redirect(new URL(ROLE_HOME[session.role] ?? "/login", req.url));
  }

  if (pathname.startsWith("/deliveries") && session.role !== "LOGISTICS_PARTNER") {
    return NextResponse.redirect(new URL(ROLE_HOME[session.role] ?? "/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
