import { headers } from "next/headers";

/**
 * The site's public address, for canonical links, the sitemap and structured
 * data: SITE_URL (read at runtime, so no rebuild to change it), else the
 * address the request came to.
 */
export async function siteUrl(): Promise<string> {
  const configured = process.env.SITE_URL?.replace(/\/+$/, "");
  if (configured) return configured;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}

/** Canonical and language alternates for a path without its locale ("/p/drill"). */
export async function alternates(path: string, locale: string) {
  const base = await siteUrl();
  return {
    canonical: `${base}/${locale}${path}`,
    languages: { fr: `${base}/fr${path}`, en: `${base}/en${path}`, "x-default": `${base}/fr${path}` },
  };
}
