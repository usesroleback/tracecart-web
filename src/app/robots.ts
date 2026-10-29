import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/siteUrl";

export const dynamic = "force-dynamic";

/** The store is open to crawlers; the console, accounts, the API proxy and search results aren't. */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const base = await siteUrl();
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/*/s", "/*/account", "/*/login", "/*/q/", "/*/dashboard", "/*/orders", "/*/catalog"] }],
    sitemap: `${base}/sitemap.xml`,
  };
}
