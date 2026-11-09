import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { STORE_CURRENCY, storeApi } from "@/lib/store";
import { siteUrl } from "@/lib/siteUrl";

// Built per request (it needs the API), and cached like the store's pages.
export const dynamic = "force-dynamic";

/** The store's pages in both languages: home, categories, brands, products. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = await siteUrl();
  const { data } = await storeApi("en").GET("/catalog/sitemap", { params: { query: { currency: STORE_CURRENCY } } });
  const entry = (path: string, lastModified?: string): MetadataRoute.Sitemap[number] => ({
    url: `${base}/${routing.defaultLocale}${path}`,
    lastModified,
    alternates: { languages: Object.fromEntries(routing.locales.map((l) => [l, `${base}/${l}${path}`])) },
  });
  // Category pages are addressed by their full path; the API lists slugs, so
  // the single-slug address is given and redirects to the full one.
  return [
    entry(""),
    entry("/c"),
    entry("/brands"),
    entry("/about"),
    entry("/terms"),
    entry("/privacy"),
    entry("/contact"),
    ...(data?.categories ?? []).map((c) => entry(`/c/${c.slug}`)),
    ...(data?.brands ?? []).map((b) => entry(`/b/${b.slug}`)),
    ...(data?.products ?? []).map((p) => entry(`/p/${p.slug}`, p.updatedAt)),
  ];
}
