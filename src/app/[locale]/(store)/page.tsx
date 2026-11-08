import type { Metadata } from "next";
import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { QuoteBar } from "@/components/site/QuoteBar";
import { StoreShell } from "@/components/store/StoreShell";
import { SearchBox } from "@/components/store/SearchBox";
import { ProductList } from "@/components/store/ProductCard";
import { ForgetSeen } from "@/components/store/SaveCompare";
import { JsonLd } from "@/components/store/JsonLd";
import { countryName } from "@/lib/country";
import { MAX_SEEN, parseSlugs, SEEN_COOKIE } from "@/lib/shelf";
import { STORE_CURRENCY, storeApi, storeCountry, type ProductCard } from "@/lib/store";
import { alternates, siteUrl } from "@/lib/siteUrl";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "store.meta" });
  return { title: t("homeTitle"), description: t("homeDescription"), alternates: await alternates("", locale) };
}

/**
 * The store's front page (PLAN §14 G2, ADR-078): search and departments, then
 * collections drawn from real activity only (popular from orders, deals,
 * what this device viewed, what's in stock nearby, what's new), photo search,
 * the brands, the other services, and the finder. A collection with nothing
 * in it, or whose data can't be fetched, is left out.
 */
export default async function StoreHome({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ need?: string }> }) {
  const { locale } = await params;
  const { need } = await searchParams;
  const t = await getTranslations("store.home");
  const api = storeApi(locale);
  const country = await storeCountry();
  const context = { country, currency: STORE_CURRENCY };
  const seenSlugs = parseSlugs((await cookies()).get(SEEN_COOKIE)?.value, MAX_SEEN);
  const quiet = <T,>(p: Promise<{ data?: T }>) => p.then((r) => r.data).catch(() => undefined);

  const [tree, trending, deals, seen, inStock, newest, brands] = await Promise.all([
    quiet(api.GET("/catalog/categories", { params: { query: context } })),
    quiet(api.GET("/catalog/trending", { params: { query: { ...context, limit: 8 } } })),
    quiet(api.GET("/catalog/deals", { params: { query: context } })),
    seenSlugs.length ? quiet(api.GET("/catalog/cards", { params: { query: { ...context, slug: seenSlugs } } })) : Promise.resolve(undefined),
    quiet(api.GET("/catalog/products", { params: { query: { ...context, pageSize: 8, ...(country ? { delivery: "local" as const } : {}) } } })),
    quiet(api.GET("/catalog/products", { params: { query: { ...context, sort: "newest", pageSize: 8 } } })),
    quiet(api.GET("/catalog/brands", { params: { query: context } })),
  ]);
  const base = await siteUrl();
  const departments = tree?.categories ?? [];

  return (
    <StoreShell>
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
        {departments.length ? (
          <ul className="mt-6 flex flex-wrap gap-2">
            {/* Departments with something in them first (ADR-077). */}
            {[...departments].sort((a, b) => Number(b.count > 0) - Number(a.count > 0)).slice(0, 8).map((c) => (
              <li key={c.slug}>
                <Link href={`/c/${c.slug}`} className="inline-flex rounded-[var(--radius-xs)] border border-line bg-surface-raised px-3 py-1.5 text-sm text-ink hover:border-ink">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <Collection id="home-trending" title={t("trendingTitle")} lead={trending ? t("trendingLead", { days: trending.days }) : undefined} items={trending?.items} />
      <Collection id="home-deals" title={t("dealsTitle")} items={deals?.items.slice(0, 8)} href="/deals" seeAll={t("seeAll")} />
      <Collection id="home-seen" title={t("seenTitle")} items={seen?.items} action={<ForgetSeen label={t("seenClear")} />} />
      <Collection
        id="home-local"
        title={country ? t("localTitle", { country: countryName(country, locale) }) : t("localTitleAnywhere")}
        items={inStock?.items}
        href={country ? "/s?delivery=local" : "/s"}
        seeAll={t("seeAll")}
      />

      {departments.length ? (
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
            {departments.map((c) => (
              <li key={c.slug}>
                <Link href={`/c/${c.slug}`} className="flex h-full min-h-24 flex-col justify-between gap-3 rounded-[var(--radius-m)] border border-line bg-surface-raised p-4 hover:border-ink">
                  <span className="font-medium leading-snug text-ink">{c.name}</span>
                  <span className="rb-mono-s text-ink-muted">{c.count ? t("products", { count: c.count }) : t("nothingYet")}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Visual discovery: the photo search that exists, not a gallery of made-up looks. */}
      <section aria-labelledby="home-photo" className="mt-12 grid items-center gap-6 rounded-[var(--hp-corner-panel)] border border-line bg-surface-raised px-5 py-8 sm:px-10 md:grid-cols-[1fr_auto]">
        <div>
          <p className="rb-overline text-ink-muted">{t("photoEyebrow")}</p>
          <h2 id="home-photo" className="rb-headline mt-2 max-w-[26ch] text-[24px] sm:text-[30px]">
            {t("photoTitle")}
          </h2>
          <p className="mt-3 max-w-2xl text-ink-muted">{t("photoLead")}</p>
        </div>
        <Link href="/s/ai" className="inline-flex h-12 items-center justify-center gap-2 rounded-[var(--radius-s)] bg-ink px-6 font-medium text-ink-inverse hover:opacity-90">
          <svg viewBox="0 0 20 20" aria-hidden className="size-5" fill="none" stroke="currentColor" strokeWidth="1.7">
            <path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h2l1.2-1.8h4.6L13.5 6h2A1.5 1.5 0 0 1 17 7.5v7a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 3 14.5Z" strokeLinejoin="round" />
            <circle cx="10" cy="10.8" r="2.8" />
          </svg>
          {t("photoCta")}
        </Link>
      </section>

      <Collection id="home-new" title={t("newTitle")} items={newest?.items} href="/s?sort=newest" seeAll={t("seeAll")} />

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

      <section aria-labelledby="home-services" className="mt-14">
        <h2 id="home-services" className="rb-title-l mb-4">
          {t("servicesTitle")}
        </h2>
        <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {(
            [
              { key: "ship", href: "/freight" },
              { key: "sell", href: "/sell" },
              { key: "business", href: "/business" },
              { key: "carry", href: "/carry" },
            ] as const
          ).map((s) => (
            <li key={s.key}>
              <Link href={s.href} className="flex h-full flex-col gap-2 rounded-[var(--radius-m)] border border-line bg-surface-raised p-5 hover:border-ink">
                <span className="text-lg font-semibold text-ink">{t(`services.${s.key}.title`)}</span>
                <span className="text-sm text-ink-muted">{t(`services.${s.key}.body`)}</span>
                <span className="mt-auto pt-2 text-sm font-medium text-ink underline underline-offset-4">{t(`services.${s.key}.cta`)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

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

/** A row of product cards under a heading; nothing at all when it's empty. */
async function Collection({
  id,
  title,
  lead,
  items,
  href,
  seeAll,
  action,
}: {
  id: string;
  title: string;
  lead?: string;
  items?: ProductCard[];
  href?: string;
  seeAll?: string;
  action?: React.ReactNode;
}) {
  if (!items?.length) return null;
  return (
    <section aria-labelledby={id} className="mt-12">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div>
          <h2 id={id} className="rb-title-l">
            {title}
          </h2>
          {lead ? <p className="mt-1 text-sm text-ink-muted">{lead}</p> : null}
        </div>
        {href && seeAll ? (
          <Link href={href} className="text-sm font-medium text-ink underline">
            {seeAll}
          </Link>
        ) : (
          action
        )}
      </div>
      <ProductList products={items} />
    </section>
  );
}
