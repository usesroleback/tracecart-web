import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { StoreShell } from "@/components/store/StoreShell";
import { ListingView } from "@/components/store/ListingView";
import { Breadcrumbs } from "@/components/store/Breadcrumbs";
import { EmptyListing } from "@/components/store/EmptyListing";
import { apiQuery, parseListing, type SearchParams } from "@/lib/listingParams";
import { currencyExponent, STORE_CURRENCY, storeApi, storeCountry } from "@/lib/store";
import { alternates } from "@/lib/siteUrl";

type Props = { params: Promise<{ locale: string; slug: string }>; searchParams: Promise<SearchParams> };

async function load(locale: string, slug: string) {
  if (!/^[a-z0-9-]+$/.test(slug)) notFound();
  const { data, response } = await storeApi(locale).GET("/catalog/brands/{slug}", { params: { path: { slug }, query: { country: await storeCountry(), currency: STORE_CURRENCY } } });
  if (!data) {
    if (response.status === 404) notFound();
    throw new Error(`Brand ${slug}: ${response.status}`);
  }
  return data;
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const brand = await load(locale, slug);
  const t = await getTranslations({ locale, namespace: "store.meta" });
  return {
    title: brand.name,
    description: brand.description ?? t("brandDescription", { brand: brand.name, count: brand.count }),
    alternates: await alternates(`/b/${brand.slug}`, locale),
    robots: Object.keys(await searchParams).length ? { index: false, follow: true } : undefined,
  };
}

export default async function BrandPage({ params, searchParams }: Props) {
  const { locale, slug } = await params;
  const brand = await load(locale, slug);
  const state = parseListing(await searchParams);
  const t = await getTranslations("store");
  const exponent = currencyExponent(STORE_CURRENCY);
  const { data: listing } = await storeApi(locale).GET("/catalog/products", {
    params: { query: { ...apiQuery({ ...state, brand: [brand.slug] }, exponent), country: await storeCountry(), currency: STORE_CURRENCY, pageSize: 24 } },
  });
  if (!listing) throw new Error(`Listing for brand ${slug} failed`);
  return (
    <StoreShell>
      <ListingView
        listing={listing}
        state={{ ...state, brand: [] }}
        path={`/b/${brand.slug}`}
        locale={locale}
        currency={STORE_CURRENCY}
        exponent={exponent}
        hideBrands
        categoryHref={(c) => `/s?category=${c}&brand=${brand.slug}`}
        heading={
          <>
            <Breadcrumbs label={t("product.breadcrumbs")} items={[{ name: t("brands.title"), href: "/brands" }, { name: brand.name }]} />
            <h1 className="rb-headline text-[30px] sm:text-[40px]">{brand.name}</h1>
          </>
        }
        intro={brand.description ? <p className="mt-2 max-w-3xl text-ink-muted">{brand.description}</p> : null}
        empty={<EmptyListing />}
      />
    </StoreShell>
  );
}
