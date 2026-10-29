import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { QuoteBar } from "@/components/site/QuoteBar";
import { StoreShell } from "@/components/store/StoreShell";
import { SearchBox } from "@/components/store/SearchBox";
import { ProductList } from "@/components/store/ProductCard";
import { JsonLd } from "@/components/store/JsonLd";
import { countryName } from "@/lib/country";
import { STORE_CURRENCY, storeApi, storeCountry } from "@/lib/store";
import { alternates, siteUrl } from "@/lib/siteUrl";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "store.meta" });
  return { title: t("homeTitle"), description: t("homeDescription"), alternates: await alternates("", locale) };
}

/**
 * The store's front page: search, the categories, what's in stock in the
 * visitor's country, what's new, the brands, and the finder for anything the
 * catalogue doesn't have. Sections whose data can't be fetched are left out.
 */
export default async function StoreHome({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ need?: string }> }) {
  const { locale } = await params;
  const { need } = await searchParams;
  const t = await getTranslations("store.home");
  const api = storeApi(locale);
  const country = await storeCountry();
  const context = { country, currency: STORE_CURRENCY };

  const [tree, inStock, newest, brands] = await Promise.all([
    api.GET("/catalog/categories", { params: { query: context } }).then((r) => r.data).catch(() => undefined),
    api
      .GET("/catalog/products", { params: { query: { ...context, pageSize: 8, ...(country ? { delivery: "local" as const } : {}) } } })
      .then((r) => r.data)
      .catch(() => undefined),
    api.GET("/catalog/products", { params: { query: { ...context, sort: "newest", pageSize: 8 } } }).then((r) => r.data).catch(() => undefined),
    api.GET("/catalog/brands", { params: { query: context } }).then((r) => r.data).catch(() => undefined),
  ]);
  const base = await siteUrl();

  return (
    <StoreShell search={false}>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Tracecart",
          url: `${base}/${locale}`,
          potentialAction: { "@type": "SearchAction", target: `${base}/${locale}/s?q={search_term_string}`, "query-input": "required name=search_term_string" },
        }}
      />
      <section className="rounded-[var(--hp-corner-panel)] bg-surface-sunken px-5 py-10 sm:px-10 sm:py-14">
        <h1 className="rb-headline max-w-[22ch] text-[32px] leading-[1.05] sm:text-[48px]">{t("title")}</h1>
        <p className="mt-4 max-w-2xl text-lg text-ink-muted">{t("lead")}</p>
        <div className="mt-8 max-w-2xl">
          <SearchBox size="l" />
        </div>
        {tree?.categories.length ? (
          <ul className="mt-6 flex flex-wrap gap-2">
            {tree.categories.slice(0, 8).map((c) => (
              <li key={c.slug}>
                <Link href={`/c/${c.slug}`} className="inline-flex rounded-[var(--radius-xs)] border border-line bg-surface-raised px-3 py-1.5 text-sm text-ink hover:border-ink">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      {tree?.categories.length ? (
        <section aria-labelledby="home-categories" className="mt-12">
          <div className="mb-4 flex items-baseline justify-between gap-4">
            <h2 id="home-categories" className="rb-title-l">
              {t("categoriesTitle")}
            </h2>
            <Link href="/c" className="text-sm font-medium text-ink underline">
              {t("seeAll")}
            </Link>
          </div>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {tree.categories.map((c) => (
              <li key={c.slug}>
                <Link href={`/c/${c.slug}`} className="flex h-full min-h-24 flex-col justify-between gap-3 rounded-[var(--radius-m)] border border-line bg-surface-raised p-4 hover:border-ink">
                  <span className="font-medium leading-snug text-ink">{c.name}</span>
                  <span className="rb-mono-s text-ink-muted">{t("products", { count: c.count })}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {inStock?.items.length ? (
        <section aria-labelledby="home-local" className="mt-12">
          <div className="mb-4 flex items-baseline justify-between gap-4">
            <h2 id="home-local" className="rb-title-l">
              {country ? t("localTitle", { country: countryName(country, locale) }) : t("localTitleAnywhere")}
            </h2>
            <Link href={country ? "/s?delivery=local" : "/s"} className="text-sm font-medium text-ink underline">
              {t("seeAll")}
            </Link>
          </div>
          <ProductList products={inStock.items} />
        </section>
      ) : null}

      {newest?.items.length ? (
        <section aria-labelledby="home-new" className="mt-12">
          <div className="mb-4 flex items-baseline justify-between gap-4">
            <h2 id="home-new" className="rb-title-l">
              {t("newTitle")}
            </h2>
            <Link href="/s?sort=newest" className="text-sm font-medium text-ink underline">
              {t("seeAll")}
            </Link>
          </div>
          <ProductList products={newest.items} />
        </section>
      ) : null}

      {brands?.brands.length ? (
        <section aria-labelledby="home-brands" className="mt-12">
          <h2 id="home-brands" className="rb-title-l mb-4">
            {t("brandsTitle")}
          </h2>
          <ul className="flex flex-wrap gap-2">
            {brands.brands.map((b) => (
              <li key={b.slug}>
                <Link href={`/b/${b.slug}`} className="inline-flex items-center gap-2 rounded-[var(--radius-xs)] border border-line bg-surface-raised px-4 py-2 text-sm font-medium text-ink hover:border-ink">
                  {b.name}
                  <span className="rb-mono-s text-ink-muted">{b.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="home-finder" className="mt-14 rounded-[var(--hp-corner-panel)] bg-surface-sunken px-5 py-10 sm:px-10">
        <p className="rb-overline text-ink-muted">{t("finderEyebrow")}</p>
        <h2 id="home-finder" className="rb-headline mt-2 max-w-[24ch] text-[26px] sm:text-[34px]">
          {t("finderTitle")}
        </h2>
        <div className="mt-6 max-w-2xl scroll-mt-28">
          <QuoteBar initialWhat={typeof need === "string" ? need.slice(0, 300) : ""} />
        </div>
        <Link href="/about" className="mt-6 inline-block text-sm font-medium text-ink underline">
          {t("howItWorks")}
        </Link>
      </section>
    </StoreShell>
  );
}
