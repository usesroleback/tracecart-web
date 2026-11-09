import type { Metadata } from "next";
import Image from "next/image";
import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { StoreShell } from "@/components/store/StoreShell";
import { SearchBox } from "@/components/store/SearchBox";
import { JsonLd } from "@/components/store/JsonLd";
import { CategoryCard } from "@/components/store/home/CategoryCard";
import { OwnedDiscovery, PictureDiscovery } from "@/components/store/home/DiscoverySection";
import { EditorialBanner, PromoBanner } from "@/components/store/home/EditorialBanner";
import { PersonalizedRecommendations } from "@/components/store/home/PersonalizedRecommendations";
import { PhotoDrop } from "@/components/store/home/PhotoDrop";
import { ProductCollection } from "@/components/store/home/ProductCollection";
import { ShippingBanner, SourcingBanner } from "@/components/store/home/ServiceBanners";
import { CATEGORY_IMAGES, tintAt, tintVar } from "@/components/store/home/images";
import { countryName } from "@/lib/country";
import { MAX_SEEN, parseSlugs, SEEN_COOKIE } from "@/lib/shelf";
import { STORE_CURRENCY, storeApi, storeCountry } from "@/lib/store";
import { alternates, siteUrl } from "@/lib/siteUrl";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "store.meta" });
  return { title: t("homeTitle"), description: t("homeDescription"), alternates: await alternates("", locale) };
}

/**
 * The store's front page (PLAN §14 G2, ADR-078, ADR-085): search first, then a
 * run of different kinds of section. Products come only from real activity and
 * stock; a collection with nothing in it, or whose data can't be fetched, is
 * left out. Department photographs always show, and lead to the department,
 * which says so when it's empty.
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
    quiet(api.GET("/catalog/trending", { params: { query: { ...context, limit: 10 } } })),
    quiet(api.GET("/catalog/deals", { params: { query: context } })),
    seenSlugs.length ? quiet(api.GET("/catalog/cards", { params: { query: { ...context, slug: seenSlugs } } })) : Promise.resolve(undefined),
    quiet(api.GET("/catalog/products", { params: { query: { ...context, pageSize: 8, ...(country ? { delivery: "local" as const } : {}) } } })),
    quiet(api.GET("/catalog/products", { params: { query: { ...context, sort: "newest", pageSize: 9 } } })),
    quiet(api.GET("/catalog/brands", { params: { query: context } })),
  ]);
  const departments = tree?.categories ?? [];
  const bySlug = new Map(departments.map((d) => [d.slug, d]));

  // The two fullest departments with a photograph lead the editorial sections.
  const featured = departments.filter((d) => d.count > 0 && CATEGORY_IMAGES[d.slug]).sort((a, b) => b.count - a.count).slice(0, 2);
  const featuredItems = await Promise.all(featured.map((d) => quiet(api.GET("/catalog/products", { params: { query: { ...context, category: d.slug, pageSize: 4 } } }))));

  const popular = Object.keys(CATEGORY_IMAGES).flatMap((slug) => bySlug.get(slug) ?? []);
  const worthALook = (
    [
      { key: "fashion", slug: "fashion", image: "/images/categories/fashion.jpg" },
      { key: "home", slug: "home-living", image: "/images/collections/home.jpg" },
      { key: "beauty", slug: "beauty-personal-care", image: "/images/collections/beauty.jpg" },
      { key: "electronics", slug: "electronics", image: "/images/categories/electronics.jpg" },
    ] as const
  ).filter((c) => bySlug.has(c.slug));
  const examples = t.raw("welcomeExamples") as { label: string; image: string }[];
  const base = await siteUrl();

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

      {/* A: search first. */}
      <section style={{ background: tintVar("mint") }} className="grid gap-6 rounded-[var(--hp-corner-panel)] p-5 sm:p-8 lg:grid-cols-[3fr_2fr] lg:items-center lg:p-10">
        <div>
          <h1 className="rb-headline max-w-[20ch] text-[32px] leading-[1.05] sm:text-[46px]">{t("title")}</h1>
          <p className="mt-3 max-w-xl text-lg text-ink-muted">{t("lead")}</p>
          {/* On a phone the header's search is already right above. */}
          <div className="mt-6 hidden max-w-2xl md:block">
            <SearchBox size="l" />
          </div>
          <div className="mt-5 max-w-2xl md:mt-3">
            <PhotoDrop />
          </div>
        </div>
        <ul className="grid grid-cols-3 gap-2 sm:gap-3">
          {examples.map((e, i) => (
            <li key={e.label}>
              <Link href={`/s/ai?q=${encodeURIComponent(e.label)}`} className="st-tile block overflow-hidden rounded-[var(--radius-s)] bg-surface-raised">
                <span className="relative block aspect-[3/4] overflow-hidden">
                  <Image src={e.image} alt="" fill sizes="(min-width: 1024px) 13vw, 30vw" priority={i === 0} className="st-photo object-cover" />
                </span>
                <span className="block p-2 text-xs font-medium leading-snug text-ink sm:p-3 sm:text-sm">{e.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* B: mixed sizes, so the first thing below the search isn't another even grid. */}
      {popular.length ? (
        <section aria-labelledby="home-popular" className="mt-10">
          <h2 id="home-popular" className="rb-title-l mb-4">
            {t("popularTitle")}
          </h2>
          <ul className="grid auto-rows-[190px] grid-cols-2 gap-3 sm:gap-4 md:auto-rows-[210px] md:grid-cols-4">
            {popular.map((d, i) => (
              <li key={d.slug} className={i === 0 ? "col-span-2 md:row-span-2" : i === 5 ? "md:col-span-2" : i === popular.length - 1 ? "col-span-2 md:col-span-1" : ""}>
                <CategoryCard href={`/c/${d.slug}`} name={d.name} note={d.count ? t("products", { count: d.count }) : undefined} image={CATEGORY_IMAGES[d.slug]} tint={tintAt(i)} sizes={i === 0 ? "(min-width: 768px) 50vw, 100vw" : "(min-width: 768px) 25vw, 50vw"} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* C */}
      <ProductCollection id="home-trending" title={t("trendingTitle")} lead={trending ? t("trendingLead", { days: trending.days }) : undefined} items={trending?.items} layout="carousel" />

      {/* D */}
      <PictureDiscovery />

      {/* E: four different treatments. */}
      {featured[0] && featuredItems[0]?.items.length ? <EditorialBanner id="home-editorial-1" title={featured[0].name} href={`/c/${featured[0].slug}`} image={CATEGORY_IMAGES[featured[0].slug]} tint="stone" items={featuredItems[0].items} /> : null}

      <ProductCollection id="home-deals" title={t("dealsTitle")} items={deals?.items.slice(0, 10)} href="/deals" layout="carousel" />

      {worthALook.length ? (
        <section aria-labelledby="home-look" className="mt-12">
          <h2 id="home-look" className="rb-title-l mb-4">
            {t("collections.title")}
          </h2>
          <ul className="grid auto-rows-[260px] grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {worthALook.map((c, i) => (
              <li key={c.key}>
                <CategoryCard href={`/c/${c.slug}`} name={t(`collections.${c.key}`)} image={c.image} tint={tintAt(i + 1)} sizes="(min-width: 1024px) 25vw, 50vw" />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <PromoBanner id="home-gifts" title={t("gifts.title")} body={t("gifts.body")} cta={t("gifts.cta")} href="/s/ai" image="/images/collections/gifts.jpg" />

      <ProductCollection id="home-new" title={t("newTitle")} items={newest?.items} href="/s?sort=newest" layout="mosaic" />

      {/* F */}
      <OwnedDiscovery />

      {featured[1] && featuredItems[1]?.items.length ? <EditorialBanner id="home-editorial-2" title={featured[1].name} href={`/c/${featured[1].slug}`} image={CATEGORY_IMAGES[featured[1].slug]} tint="sky" items={featuredItems[1].items} flip /> : null}

      {/* G: every department, including the ones still empty, which say so. */}
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
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5">
            {departments.map((c, i) => (
              <li key={c.slug}>
                <Link href={`/c/${c.slug}`} style={{ background: tintVar(tintAt(i)) }} className="st-tile flex h-full min-h-20 flex-col justify-between gap-2 rounded-[var(--radius-s)] p-3">
                  <span className="font-medium leading-snug text-ink">{c.name}</span>
                  <span className="rb-mono-s text-ink-muted">{c.count ? t("products", { count: c.count }) : t("nothingYet")}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* H, I */}
      <SourcingBanner need={typeof need === "string" ? need.slice(0, 300) : ""} />
      <ShippingBanner />

      {/* J */}
      <PersonalizedRecommendations seen={seen?.items} inStock={inStock?.items} inStockTitle={country ? t("localTitle", { country: countryName(country, locale) }) : t("localTitleAnywhere")} inStockHref={country ? "/s?delivery=local" : "/s"} />

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

      <ul className="mt-12 grid gap-3 md:grid-cols-3">
        {(
          [
            { key: "sell", href: "/sell" },
            { key: "business", href: "/business" },
            { key: "carry", href: "/carry" },
          ] as const
        ).map((s) => (
          <li key={s.key}>
            <Link href={s.href} className="st-tile flex h-full flex-col gap-2 rounded-[var(--radius-m)] border border-line bg-surface-raised p-5">
              <span className="text-lg font-semibold text-ink">{t(`services.${s.key}.title`)}</span>
              <span className="text-sm text-ink-muted">{t(`services.${s.key}.body`)}</span>
              <span className="mt-auto pt-2 text-sm font-medium text-ink underline underline-offset-4">{t(`services.${s.key}.cta`)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </StoreShell>
  );
}
