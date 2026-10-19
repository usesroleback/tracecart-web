import { NextRequest, NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { SESSION_COOKIE, decodeToken } from "./lib/session";

const intlMiddleware = createIntlMiddleware(routing);

const ROLE_HOME: Record<string, string> = {
  SUPER_ADMIN: "/orders",
  LOGISTICS_PARTNER: "/deliveries",
};

const LOCALE_PATTERN = /^\/(fr|en)(\/.*|$)/;

/**
 * Strips a leading /fr or /en so the role/session checks below can keep
 * comparing against the same bare paths they always have ("/", "/login",
 * "/orders", ...), regardless of which locale prefix the request arrived
 * under.
 */
function stripLocale(pathname: string): string {
  const match = pathname.match(LOCALE_PATTERN);
  return match ? match[2] || "/" : pathname;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // By the time this function needs to build a redirect URL itself (login
  // bounce, role bounce), the request is already inside a locale-prefixed
  // URL — falling back to the default locale only covers the rare case of
  // a request matching the middleware matcher without one yet, which the
  // intlMiddleware delegate below handles via its own locale negotiation.
  const locale = pathname.match(LOCALE_PATTERN)?.[1] ?? routing.defaultLocale;
  const localized = (path: string) => `/${locale}${path}`;
  const bare = stripLocale(pathname);

  // Public surfaces — no session, no login redirect. "/" is the public
  // marketing site (TraceCartSite); /q/* is the customer-facing quote page;
  // /legal/* are the privacy/terms pages. The authenticated console lives
  // at /dashboard and the other admin/partner paths below.
  if (bare === "/" || bare.startsWith("/q/") || bare.startsWith("/legal/")) {
    return intlMiddleware(req);
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? decodeToken(token) : null;

  if (bare === "/login") {
    if (session) {
      return NextResponse.redirect(new URL(localized("/dashboard"), req.url));
    }
    return intlMiddleware(req);
  }

  if (!session) {
    return NextResponse.redirect(new URL(localized("/login"), req.url));
  }

  const adminOnlyPaths = ["/orders", "/products", "/stores", "/hub-setup", "/reservations"];
  if (adminOnlyPaths.some((p) => bare.startsWith(p)) && session.role !== "SUPER_ADMIN") {
    return NextResponse.redirect(new URL(localized(ROLE_HOME[session.role] ?? "/login"), req.url));
  }

  if (bare.startsWith("/deliveries") && session.role !== "LOGISTICS_PARTNER") {
    return NextResponse.redirect(new URL(localized(ROLE_HOME[session.role] ?? "/login"), req.url));
  }

  return intlMiddleware(req);
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
