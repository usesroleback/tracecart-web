import { NextResponse } from "next/server";
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
 * No sign-in needed: the marketing site, the login page, the customer quote
 * page (/q/*) and the legal pages. Everything else is the console.
 */
function isPublic(bare: string): boolean {
  return bare === "/" || bare === "/login" || bare.startsWith("/q/") || bare.startsWith("/legal/");
}

export default clerkMiddleware(async (auth, req) => {
  const { pathname } = req.nextUrl;

  // Route handlers need Clerk's session (the API proxy calls auth()), but not
  // locale routing.
  if (pathname.startsWith("/api")) return NextResponse.next();

  const bare = stripLocale(pathname);
  if (!isPublic(bare)) {
    const { userId } = await auth();
    if (!userId) {
      const locale = pathname.match(LOCALE_PATTERN)?.[1] ?? routing.defaultLocale;
      return NextResponse.redirect(new URL(`/${locale}/login`, req.url));
    }
  }

  // Roles are checked by each console section's layout (see lib/session.ts).
  return intlMiddleware(req);
});

export const config = {
  // Clerk's recommended matcher: everything except Next internals and static
  // files, plus all API routes.
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
