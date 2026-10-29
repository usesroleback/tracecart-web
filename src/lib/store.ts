import { cookies } from "next/headers";
import createClient from "openapi-fetch";
import type { components, paths } from "./api/schema";
import { SERVER_API_URL } from "./apiBase";
import { COUNTRY_COOKIE, isCountryCode } from "./country";

export { currencyExponent, toMajor } from "./currency";

// The store's pages read the public catalogue on the server (docs/PLAN.md
// phase 4). Answers may be a minute old: the API caches them until the
// catalogue changes, and Next keeps each one for 60 seconds.

export type ProductCard = components["schemas"]["ProductCard"];
export type ProductListing = components["schemas"]["ProductListing"];
export type ProductDetail = components["schemas"]["ProductDetail"];
export type PublicOffer = components["schemas"]["PublicOffer"];
export type Availability = components["schemas"]["Availability"];
export type CategoryNode = components["schemas"]["CategoryNode"];

/** Prices are shown in one currency per store, never converted (ADR-028). The settings module will make it per country. */
export const STORE_CURRENCY = "XOF";

const REVALIDATE_SECONDS = 60;

export function storeApi(locale: string) {
  return createClient<paths>({
    baseUrl: SERVER_API_URL,
    headers: { "X-Tracecart-Locale": locale },
    fetch: (request: Request) => fetch(request, { next: { revalidate: REVALIDATE_SECONDS } }),
  });
}

/** The visitor's country, when known (the site's cookie): what counts as "in stock near you". */
export async function storeCountry(): Promise<string | undefined> {
  const saved = (await cookies()).get(COUNTRY_COOKIE)?.value;
  return isCountryCode(saved) ? saved : undefined;
}

/** The category path of a category page: /c/power-tools/drills-drivers. */
export const categoryHref = (breadcrumbs: { slug: string }[]) => `/c/${breadcrumbs.map((b) => b.slug).join("/")}`;

/** Images from these hosts go through next/image (resized, AVIF/WebP); others are shown as they are. */
export const OPTIMISED_IMAGE_HOSTS = (process.env.NEXT_PUBLIC_IMAGE_HOSTS ?? "placehold.co")
  .split(",")
  .map((h) => h.trim())
  .filter(Boolean);
