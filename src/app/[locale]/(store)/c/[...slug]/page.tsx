import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { StoreShell } from "@/components/store/StoreShell";
import { ListingView } from "@/components/store/ListingView";
import { Breadcrumbs } from "@/components/store/Breadcrumbs";
import { EmptyListing } from "@/components/store/EmptyListing";
import { JsonLd } from "@/components/store/JsonLd";
import { apiQuery, listingHref, parseListing, type SearchParams } from "@/lib/listingParams";
import { categoryHref, currencyExponent, STORE_CURRENCY, storeApi, storeCountry } from "@/lib/store";
import { alternates, siteUrl } from "@/lib/siteUrl";

type Props = { params: Promise<{ locale: string; slug: string[] }>; searchParams: Promise<SearchParams> };

async function load(locale: string, slug: string[]) {
  const last = slug[slug.length - 1];
  if (!/^[a-z0-9-]+$/.test(last)) notFound();
  const { data, response } = await storeApi(locale).GET("/catalog/categories/{slug}", {
    params: { path: { slug: last }, query: { country: await storeCountry(), currency: STORE_CURRENCY } },
  });
  if (!data) {
    if (response.status === 404) notFound();
    throw new Error(`Category ${last}: ${response.status}`);
  }
  return data;
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const category = await load(locale, slug);
  const t = await getTranslations({ locale, namespace: "store.meta" });
  const filtered = Object.keys(await searchParams).length > 0;
  return {
    title: category.name,
    description: category.description ?? t("categoryDescription", { category: category.name, count: category.count }),
    alternates: await alternates(categoryHref(category.breadcrumbs), locale),
    // Filtered and sorted copies of a category stay out of search engines' indexes.
    robots: filtered ? { index: false, follow: true } : undefined,
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { locale, slug } = await params;
  const category = await load(locale, slug);
  const path = categoryHref(category.breadcrumbs);
  const sp = await searchParams;
  const state = parseListing(sp);
  // One address per category: /c/power-tools/drills-drivers, not /c/drills-drivers.
  if (`/c/${slug.join("/")}` !== path) permanentRedirect(`/${locale}${listingHref(path, state)}`);

  const t = await getTranslations("store");
  const exponent = currencyExponent(STORE_CURRENCY);
  const { data: listing } = await storeApi(locale).GET("/catalog/products", {
    params: { query: { ...apiQuery(state, exponent), category: category.slug, country: await storeCountry(), currency: STORE_CURRENCY, pageSize: 24 } },
  });
  if (!listing) throw new Error(`Listing for ${category.slug} failed`);
  const base = await siteUrl();

  return (
    <StoreShell>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: category.breadcrumbs.map((b, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: b.name,
            item: `${base}/${locale}${categoryHref(category.breadcrumbs.slice(0, i + 1))}`,
          })),
        }}
      />
      <ListingView
        listing={listing}
        state={state}
        path={path}
        locale={locale}
        currency={STORE_CURRENCY}
        exponent={exponent}
        categoryHref={(child) => `${path}/${child}`}
        heading={
          <>
            <Breadcrumbs
              label={t("product.breadcrumbs")}
              items={[{ name: t("catalogue.title"), href: "/c" }, ...category.breadcrumbs.map((b, i) => ({ name: b.name, href: categoryHref(category.breadcrumbs.slice(0, i + 1)) }))]}
            />
            <h1 className="rb-headline text-[30px] sm:text-[40px]">{category.name}</h1>
          </>
        }
        intro={category.description ? <p className="mt-2 max-w-3xl text-ink-muted">{category.description}</p> : null}
        empty={<EmptyListing department={category.count === 0 ? category.name : undefined} />}
      />
    </StoreShell>
  );
}
