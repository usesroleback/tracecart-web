import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { StoreShell } from "@/components/store/StoreShell";
import { ListingView } from "@/components/store/ListingView";
import { EmptyListing } from "@/components/store/EmptyListing";
import { apiQuery, parseListing, withCategory, listingHref, type SearchParams } from "@/lib/listingParams";
import { currencyExponent, STORE_CURRENCY, storeApi, storeCountry } from "@/lib/store";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<SearchParams> };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale } = await params;
  const { q } = parseListing(await searchParams);
  const t = await getTranslations({ locale, namespace: "store.meta" });
  // Search results are for people, not indexes.
  return { title: q ? t("searchTitle", { query: q }) : t("searchEmptyTitle"), robots: { index: false, follow: true } };
}

/** Keyword search over the catalogue (and, without a query, everything, filtered). */
export default async function SearchPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const state = parseListing(await searchParams);
  const t = await getTranslations("store");
  const exponent = currencyExponent(STORE_CURRENCY);
  const { data: listing, response } = await storeApi(locale).GET("/catalog/products", {
    params: { query: { ...apiQuery(state, exponent), country: await storeCountry(), currency: STORE_CURRENCY, pageSize: 24 } },
  });
  if (!listing) {
    // An unknown category in the address.
    if (response.status === 404) notFound();
    throw new Error(`Search failed: ${response.status}`);
  }
  return (
    <StoreShell query={state.q}>
      <ListingView
        listing={listing}
        state={state}
        path="/s"
        locale={locale}
        currency={STORE_CURRENCY}
        exponent={exponent}
        categoryHref={(slug) => listingHref("/s", withCategory(state, slug))}
        heading={<h1 className="rb-headline text-[28px] sm:text-[36px]">{state.q ? `“${state.q}”` : listing.category?.name ?? t("catalogue.title")}</h1>}
        empty={<EmptyListing query={state.q} />}
      />
    </StoreShell>
  );
}
