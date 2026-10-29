import { NextFetchEvent, NextRequest, NextResponse } from "next/server";
import { clerkMiddleware } from "@clerk/nextjs/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

const LOCALE_PATTERN = /^\/(fr|en)(\/.*|$)/;

/**
 * Strips a leading /fr or /en so the checks below can compare against bare
 * paths ("/", "/login", "/orders", ...) whatever locale prefix the request has.
 */
function stripLocale(pathname: string): string {
  const match = pathname.match(LOCALE_PATTERN);
  return match ? match[2] || "/" : pathname;
}

/**
 * Pages that never involve sign-in: the store (home, categories, products,
 * brands, search), /about, the customer quote page (/q/*) and the legal
 * pages. They skip Clerk entirely — with a development Clerk key, Clerk
 * otherwise redirects a browser's first visit through Clerk's servers, even
 * on pages that don't use it.
 */
const ANONYMOUS_EXACT = new Set(["/", "/about", "/c", "/brands", "/s"]);
const ANONYMOUS_PREFIXES = ["/q/", "/legal/", "/c/", "/p/", "/b/"];

function isAnonymousPage(bare: string): boolean {
  return ANONYMOUS_EXACT.has(bare) || ANONYMOUS_PREFIXES.some((p) => bare.startsWith(p));
}

const withClerk = clerkMiddleware(async (auth, req) => {
  const { pathname } = req.nextUrl;

  // Route handlers need Clerk's session (the API proxy calls auth()), but not
  // locale routing.
  if (pathname.startsWith("/api")) return NextResponse.next();

  // The login page reads the session itself (to explain "no access" etc.),
  // and the customer account page offers sign-up and sign-in itself.
  const bare = stripLocale(pathname);
  if (bare !== "/login" && bare !== "/account" && bare !== "/ship") {
    const { userId } = await auth();
    if (!userId) {
      // The path's locale, else the one last chosen (next-intl's cookie), else the default.
      const cookie = req.cookies.get("NEXT_LOCALE")?.value;
      const chosen = routing.locales.find((l) => l === cookie);
      const locale = pathname.match(LOCALE_PATTERN)?.[1] ?? chosen ?? routing.defaultLocale;
      return NextResponse.redirect(new URL(`/${locale}/login`, req.url));
    }
  }

  // Roles are checked by each console section's layout (see lib/session.ts).
  return intlMiddleware(req);
});

export default function middleware(req: NextRequest, event: NextFetchEvent) {
  const { pathname } = req.nextUrl;
  // For crawlers, at the root, in no language.
  if (pathname === "/sitemap.xml" || pathname === "/robots.txt") return NextResponse.next();
  if (!pathname.startsWith("/api") && isAnonymousPage(stripLocale(pathname))) {
    return intlMiddleware(req);
  }
  return withClerk(req, event);
}

export const config = {
  // Clerk's recommended matcher: everything except Next internals and static
  // files, plus all API routes.
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
