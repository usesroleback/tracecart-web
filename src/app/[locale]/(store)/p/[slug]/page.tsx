import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { StoreShell } from "@/components/store/StoreShell";
import { Breadcrumbs } from "@/components/store/Breadcrumbs";
import { StoreImage } from "@/components/store/StoreImage";
import { Price } from "@/components/store/Price";
import { AvailabilityNote } from "@/components/store/AvailabilityNote";
import { ProductList } from "@/components/store/ProductCard";
import { JsonLd } from "@/components/store/JsonLd";
import { categoryHref, STORE_CURRENCY, storeApi, storeCountry, toMajor, type ProductDetail, type PublicOffer } from "@/lib/store";
import { alternates, siteUrl } from "@/lib/siteUrl";

type Props = { params: Promise<{ locale: string; slug: string }>; searchParams: Promise<{ variant?: string }> };

async function load(locale: string, slug: string, variant?: string): Promise<ProductDetail> {
  if (!/^[a-z0-9-]+$/.test(slug)) notFound();
  const { data, response } = await storeApi(locale).GET("/catalog/products/{slug}", {
    params: { path: { slug }, query: { variant: typeof variant === "string" ? variant.slice(0, 80) : undefined, country: await storeCountry(), currency: STORE_CURRENCY } },
  });
  if (!data) {
    if (response.status === 404) notFound();
    throw new Error(`Product ${slug}: ${response.status}`);
  }
  return data;
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const p = await load(locale, slug, (await searchParams).variant);
  const image = p.media.find((m) => m.kind === "IMAGE");
  return {
    title: p.seo.title,
    description: p.seo.description,
    alternates: await alternates(`/p/${p.slug}`, locale),
    openGraph: { title: p.seo.title, description: p.seo.description, type: "website", images: image ? [{ url: image.url, alt: image.alt }] : undefined },
  };
}

const SCHEMA_AVAILABILITY: Record<PublicOffer["availability"]["kind"], string> = {
  IN_STOCK: "https://schema.org/InStock",
  SELLER: "https://schema.org/InStock",
  // Bought from the supplier once ordered.
  ABROAD: "https://schema.org/BackOrder",
  OUT_OF_STOCK: "https://schema.org/OutOfStock",
};
const SCHEMA_CONDITION: Record<PublicOffer["condition"], string> = {
  NEW: "https://schema.org/NewCondition",
  REFURBISHED: "https://schema.org/RefurbishedCondition",
  USED: "https://schema.org/UsedCondition",
};

/** schema.org Product, with every variant's offers, for search engines' product results. */
function productJsonLd(p: ProductDetail, url: string, locale: string) {
  const offers = p.variants.flatMap((v) => [v.buyBox, ...v.otherOffers].filter((o): o is PublicOffer => !!o).map((o) => ({ o, v })));
  const images = p.media.filter((m) => m.kind === "IMAGE").map((m) => m.url);
  const selected = p.variants.find((v) => v.sku === p.selectedSku) ?? p.variants[0];
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.title,
    description: p.description ?? p.seo.description,
    image: images,
    sku: selected.sku,
    ...(selected.mpn ? { mpn: selected.mpn } : {}),
    ...(selected.gtin ? { gtin: selected.gtin } : {}),
    ...(p.brand ? { brand: { "@type": "Brand", name: p.brand.name } } : {}),
    category: p.breadcrumbs.map((b) => b.name).join(" > "),
    inLanguage: locale,
    url,
    offers: offers.map(({ o, v }) => ({
      "@type": "Offer",
      sku: v.sku,
      price: String(toMajor(o.price.amountMinor, o.price.currency)),
      priceCurrency: o.price.currency,
      availability: SCHEMA_AVAILABILITY[o.availability.kind],
      itemCondition: SCHEMA_CONDITION[o.condition],
      url: p.variants.length > 1 ? `${url}?variant=${encodeURIComponent(v.sku)}` : url,
      seller: { "@type": "Organization", name: o.seller?.name ?? "Tracecart" },
    })),
  };
}

/** The variant to link to for one option's value: the one matching the current choice on every other axis, else the first with that value. */
function variantFor(p: ProductDetail, axis: string, value: string) {
  const current = p.variants.find((v) => v.sku === p.selectedSku)!;
  const others = Object.entries(current.options).filter(([k]) => k !== axis);
  return (
    p.variants.find((v) => v.options[axis] === value && others.every(([k, val]) => v.options[k] === val)) ??
    p.variants.find((v) => v.options[axis] === value)
  );
}

async function OfferLine({ offer, primary = false }: { offer: PublicOffer; primary?: boolean }) {
  const t = await getTranslations("store.product");
  const seller =
    offer.seller?.name != null
      ? t("soldBy", { seller: offer.seller.name })
      : t("soldByTracecart");
  return (
    <div className="flex flex-col gap-2">
      <Price amountMinor={offer.price.amountMinor} currency={offer.price.currency} compareAtMinor={offer.compareAtMinor} size={primary ? "l" : "m"} wasLabel={(price) => t("was", { price })} />
      <AvailabilityNote availability={offer.availability} detailed />
      <p className="text-sm text-ink-muted">
        {seller}
        {offer.fulfillmentType === "FULFILLED_BY_TRACECART" ? ` · ${t("fulfilledByTracecart")}` : ""}
      </p>
    </div>
  );
}

export default async function ProductPage({ params, searchParams }: Props) {
  const { locale, slug } = await params;
  const p = await load(locale, slug, (await searchParams).variant);
  const t = await getTranslations("store");
  const format = await getFormatter();
  const base = await siteUrl();
  const url = `${base}/${locale}/p/${p.slug}`;
  const variant = p.variants.find((v) => v.sku === p.selectedSku) ?? p.variants[0];
  const offer = variant.buyBox;
  const images = p.media.filter((m) => m.kind === "IMAGE" && (!m.variantSku || m.variantSku === variant.sku));
  const documents = p.media.filter((m) => m.kind === "DOCUMENT");
  const money = (minor: number, currency: string) => `${format.number(toMajor(minor, currency))} ${currency}`;
  const crumbs = [
    { name: t("catalogue.title"), href: "/c" },
    ...p.breadcrumbs.map((b, i) => ({ name: b.name, href: categoryHref(p.breadcrumbs.slice(0, i + 1)) })),
    { name: p.title },
  ];

  return (
    <StoreShell>
      <JsonLd data={productJsonLd(p, url, locale)} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: crumbs.slice(1).map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, ...(c.href ? { item: `${base}/${locale}${c.href}` } : {}) })),
        }}
      />
      <Breadcrumbs label={t("product.breadcrumbs")} items={crumbs} />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-12">
        {/* Photos: a strip that scrolls (and snaps) on its own; thumbnails jump to each. */}
        <section aria-label={t("product.gallery")}>
          <ul className="flex snap-x snap-mandatory overflow-x-auto rounded-[var(--radius-l)] border border-line [scrollbar-width:none]">
            {(images.length ? images : [null]).map((m, i) => (
              <li key={m?.url ?? "none"} id={`photo-${i + 1}`} className="w-full shrink-0 snap-center">
                <StoreImage url={m?.url} alt={m?.alt ?? p.title} sizes="(min-width: 1024px) 50vw, 100vw" priority={i === 0} />
              </li>
            ))}
          </ul>
          {images.length > 1 ? (
            <ul className="mt-3 flex gap-2">
              {images.map((m, i) => (
                <li key={m.url}>
                  <a href={`#photo-${i + 1}`} aria-label={t("product.photo", { index: i + 1, count: images.length })} className="block w-16 overflow-hidden rounded-[var(--radius-xs)] border border-line hover:border-ink">
                    <StoreImage url={m.url} alt="" sizes="64px" />
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        <section aria-labelledby="product-title" className="flex flex-col gap-6">
          <div>
            {p.brand ? (
              <Link href={`/b/${p.brand.slug}`} className="rb-overline text-ink-muted hover:text-ink" aria-label={t("product.brandLink", { brand: p.brand.name })}>
                {p.brand.name}
              </Link>
            ) : null}
            <h1 id="product-title" className="rb-headline mt-1 text-[26px] leading-tight sm:text-[34px]">
              {p.title}
            </h1>
            <p className="rb-mono-s mt-2 text-ink-muted">
              {t("product.sku")}: {variant.sku}
            </p>
          </div>

          {p.optionAxes.map((axis) => (
            <fieldset key={axis.key}>
              <legend className="rb-label mb-2 text-ink">{p.optionAxes.length > 1 ? axis.key : t("product.choose")}</legend>
              <ul className="flex flex-wrap gap-2">
                {axis.values.map((value) => {
                  const target = variantFor(p, axis.key, value);
                  const on = variant.options[axis.key] === value;
                  return (
                    <li key={value}>
                      <Link
                        href={target ? `/p/${p.slug}?variant=${encodeURIComponent(target.sku)}` : `/p/${p.slug}`}
                        scroll={false}
                        replace
                        aria-current={on ? "true" : undefined}
                        className={`inline-flex rounded-[var(--radius-xs)] border px-3 py-2 text-sm ${on ? "border-ink bg-ink text-ink-inverse" : "border-line bg-surface-raised text-ink hover:border-ink"}`}
                      >
                        {value}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </fieldset>
          ))}

          {offer ? (
            <div className="rounded-[var(--radius-m)] border border-line bg-surface-raised p-5">
              <OfferLine offer={offer} primary />
              {offer.tiers.length ? (
                <ul className="mt-3 space-y-1 text-sm text-ink">
                  {offer.tiers.map((tier) => (
                    <li key={tier.minQuantity}>{t("product.tiers", { quantity: tier.minQuantity, price: money(tier.priceMinor, offer.price.currency) })}</li>
                  ))}
                </ul>
              ) : null}
              <p className="mt-4 text-sm text-ink-muted">{t("product.delivery")}</p>
              <div className="mt-5 border-t border-line pt-5">
                <h2 className="rb-label text-ink">{t("product.orderTitle")}</h2>
                <p className="mt-1 text-sm text-ink-muted">{t("product.orderLead")}</p>
                <Link
                  href={`/?need=${encodeURIComponent(`${p.title} (${variant.sku})`)}#quote`}
                  className="mt-4 inline-flex w-full justify-center rounded-[var(--radius-s)] bg-ink px-5 py-3 font-medium text-ink-inverse hover:opacity-90 sm:w-auto"
                >
                  {t("product.orderCta")}
                </Link>
              </div>
            </div>
          ) : null}

          {variant.otherOffers.length ? (
            <details className="rounded-[var(--radius-m)] border border-line bg-surface-raised">
              <summary className="cursor-pointer px-5 py-4 text-sm font-medium text-ink">{t("product.otherOffers", { count: variant.otherOffers.length })}</summary>
              <ul className="divide-y divide-line border-t border-line">
                {variant.otherOffers.map((o) => (
                  <li key={o.id} className="px-5 py-4">
                    <OfferLine offer={o} />
                  </li>
                ))}
              </ul>
            </details>
          ) : null}

          {p.warrantyMonths || p.certifications.length ? (
            <p className="text-sm text-ink-muted">
              {p.warrantyMonths ? t("product.warranty", { months: p.warrantyMonths }) : null}
              {p.warrantyMonths && p.certifications.length ? " · " : null}
              {p.certifications.length ? t("product.certifications", { list: p.certifications.join(", ") }) : null}
            </p>
          ) : null}
        </section>
      </div>

      <div className="mt-12 grid gap-10 lg:grid-cols-2">
        <section aria-labelledby="specs">
          <h2 id="specs" className="rb-title-l mb-4">
            {t("product.specifications")}
          </h2>
          <dl className="divide-y divide-line rounded-[var(--radius-m)] border border-line bg-surface-raised">
            {[
              ...p.attributes.map((a) => ({ label: a.label, value: a.value })),
              ...(variant.mpn ? [{ label: t("product.mpn"), value: variant.mpn }] : []),
              ...(variant.gtin ? [{ label: t("product.gtin"), value: variant.gtin }] : []),
              ...(variant.weightGrams ? [{ label: t("product.weight"), value: t("product.kg", { value: format.number(variant.weightGrams / 1000, { maximumFractionDigits: 2 }) }) }] : []),
            ].map((row) => (
              <div key={row.label} className="grid grid-cols-2 gap-4 px-4 py-3 text-sm">
                <dt className="text-ink-muted">{row.label}</dt>
                <dd className="text-ink">{row.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <div className="flex flex-col gap-8">
          {p.description ? (
            <section aria-labelledby="description">
              <h2 id="description" className="rb-title-l mb-3">
                {t("product.description")}
              </h2>
              <p className="whitespace-pre-line leading-relaxed text-ink">{p.description}</p>
            </section>
          ) : null}
          {p.inTheBox.length ? (
            <section aria-labelledby="in-the-box">
              <h2 id="in-the-box" className="rb-title mb-2">
                {t("product.inTheBox")}
              </h2>
              <ul className="list-disc space-y-1 pl-5 text-ink">
                {p.inTheBox.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </section>
          ) : null}
          {p.safety.length ? (
            <section aria-labelledby="safety">
              <h2 id="safety" className="rb-title mb-2">
                {t("product.safety")}
              </h2>
              <ul className="list-disc space-y-1 pl-5 text-ink">
                {p.safety.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </section>
          ) : null}
          {documents.length ? (
            <section aria-labelledby="documents">
              <h2 id="documents" className="rb-title mb-2">
                {t("product.documents")}
              </h2>
              <ul className="space-y-1">
                {documents.map((d) => (
                  <li key={d.url}>
                    <a href={d.url} className="text-ink underline" rel="noopener">
                      {t(`product.documentRoles.${(d.role ?? "other") as "manual"}`)}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </div>

      {p.compatibility.map((g) => (
        <section key={`${g.kind}-${g.direction}`} aria-labelledby={`compat-${g.kind}-${g.direction}`} className="mt-12">
          <h2 id={`compat-${g.kind}-${g.direction}`} className="rb-title-l mb-4">
            {t(`product.compatibility.${g.kind}_${g.direction}`)}
          </h2>
          <ProductList products={g.products.slice(0, 8)} />
        </section>
      ))}

      {p.related.length ? (
        <section aria-labelledby="related" className="mt-12">
          <h2 id="related" className="rb-title-l mb-4">
            {t("product.related", { category: p.category.name })}
          </h2>
          <ProductList products={p.related} />
        </section>
      ) : null}
    </StoreShell>
  );
}
