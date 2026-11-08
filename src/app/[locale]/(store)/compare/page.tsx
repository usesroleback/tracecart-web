import type { Metadata } from "next";
import { cookies } from "next/headers";
import { getFormatter, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { StoreShell } from "@/components/store/StoreShell";
import { StoreImage } from "@/components/store/StoreImage";
import { Price } from "@/components/store/Price";
import { AvailabilityNote } from "@/components/store/AvailabilityNote";
import { Rating } from "@/components/store/Rating";
import { RemoveFromCompare } from "@/components/store/RemoveFromCompare";
import { findHref } from "@/components/site/header/links";
import { COMPARE_COOKIE, MAX_COMPARE, parseSlugs } from "@/lib/shelf";
import { STORE_CURRENCY, storeApi, storeCountry, type ProductCard, type ProductDetail } from "@/lib/store";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ p?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "store.compare" });
  return { title: t("title"), robots: { index: false, follow: true } };
}

/**
 * Up to four products side by side (ADR-078): the ones picked with "Compare"
 * on this device, or those named in `?p=a,b` (a shared link). What each lists,
 * nothing inferred: a blank means the product doesn't say.
 */
export default async function ComparePage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { p } = await searchParams;
  const t = await getTranslations("store.compare");
  const tc = await getTranslations("store.card");
  const format = await getFormatter();
  const slugs = typeof p === "string" ? parseSlugs(p, MAX_COMPARE) : parseSlugs((await cookies()).get(COMPARE_COOKIE)?.value, MAX_COMPARE);
  const api = storeApi(locale);
  const query = { country: await storeCountry(), currency: STORE_CURRENCY };

  const [cards, details] = slugs.length
    ? await Promise.all([
        api.GET("/catalog/cards", { params: { query: { ...query, slug: slugs } } }).then((r) => r.data?.items ?? []),
        Promise.all(slugs.map((slug) => api.GET("/catalog/products/{slug}", { params: { path: { slug }, query } }).then((r) => r.data ?? null))),
      ])
    : [[] as ProductCard[], [] as (ProductDetail | null)[]];
  const byCard = new Map(cards.map((c) => [c.slug, c]));
  const columns = slugs.flatMap((slug, i) => {
    const card = byCard.get(slug);
    const detail = details[i];
    return card && detail ? [{ card, detail }] : [];
  });

  // Every specification any of them lists, in the order first met.
  const labels: string[] = [];
  for (const { detail } of columns) for (const a of detail.attributes) if (!labels.includes(a.label)) labels.push(a.label);
  const valueOf = (d: ProductDetail, label: string) => d.attributes.find((a) => a.label === label)?.value;
  const remaining = (slug: string) => columns.map((c) => c.card.slug).filter((s) => s !== slug);

  const row = "grid gap-px bg-line";
  const cols = { gridTemplateColumns: `minmax(7rem, 11rem) repeat(${Math.max(columns.length, 1)}, minmax(11rem, 1fr))` };
  const cell = "bg-surface-raised px-3 py-3 text-sm";
  const head = "bg-surface-sunken px-3 py-3 text-sm text-ink-muted";

  return (
    <StoreShell>
      <h1 className="rb-headline text-[30px] sm:text-[40px]">{t("title")}</h1>
      <p className="mt-2 max-w-2xl text-ink-muted">{t("lead")}</p>

      {columns.length < 2 ? (
        <div className="mt-8 rounded-[var(--radius-m)] border border-line bg-surface-raised p-6">
          <p className="text-ink">{columns.length === 0 ? t("empty") : t("one")}</p>
          <Link href="/c" className="mt-3 inline-block font-medium text-ink underline">
            {t("browse")}
          </Link>
        </div>
      ) : null}

      {columns.length ? (
        <div tabIndex={0} className="mt-8 overflow-x-auto rounded-[var(--radius-m)] border border-line">
          <div role="table" aria-label={t("title")} className="min-w-max">
            <div role="row" className={row} style={cols}>
              <span role="columnheader" className={head}>
                <span className="sr-only">{t("product")}</span>
              </span>
              {columns.map(({ card }) => (
                <div role="columnheader" key={card.slug} className={`${cell} flex flex-col gap-2`}>
                  <div className="w-28">
                    <StoreImage url={card.image?.url} alt={card.image?.alt ?? card.title} sizes="112px" />
                  </div>
                  <Link href={`/p/${card.slug}`} className="font-medium text-ink underline-offset-4 hover:underline">
                    {card.title}
                  </Link>
                  <RemoveFromCompare slug={card.slug} remaining={remaining(card.slug)} label={t("remove", { title: card.title })} />
                </div>
              ))}
            </div>

            <CompareRow label={t("price")} cols={cols}>
              {columns.map(({ card }) => (
                <div role="cell" key={card.slug} className={cell}>
                  {card.price ? (
                    <Price amountMinor={card.price.amountMinor} currency={card.price.currency} compareAtMinor={card.compareAtMinor} size="s" />
                  ) : (
                    <Link href={findHref(card.title)} className="font-medium text-ink underline">
                      {tc("requestQuote")}
                    </Link>
                  )}
                </div>
              ))}
            </CompareRow>
            <CompareRow label={t("availability")} cols={cols}>
              {columns.map(({ card }) => (
                <div role="cell" key={card.slug} className={cell}>
                  {card.availability ? <AvailabilityNote availability={card.availability} /> : <span className="text-ink-muted">—</span>}
                </div>
              ))}
            </CompareRow>
            <CompareRow label={t("seller")} cols={cols}>
              {columns.map(({ card }) => (
                <div role="cell" key={card.slug} className={cell}>
                  {!card.price ? "—" : card.seller ? card.seller.name : "Tracecart"}
                  {card.seller?.verified ? <span className="ml-1 font-medium">· {tc("verified")}</span> : null}
                </div>
              ))}
            </CompareRow>
            <CompareRow label={t("rating")} cols={cols}>
              {columns.map(({ card }) => (
                <div role="cell" key={card.slug} className={cell}>
                  {card.rating ? <Rating average={card.rating.average} count={card.rating.count} /> : <span className="text-ink-muted">{t("noRating")}</span>}
                </div>
              ))}
            </CompareRow>
            <CompareRow label={t("brand")} cols={cols}>
              {columns.map(({ card }) => (
                <div role="cell" key={card.slug} className={cell}>
                  {card.brand?.name ?? "—"}
                </div>
              ))}
            </CompareRow>
            <CompareRow label={t("category")} cols={cols}>
              {columns.map(({ card, detail }) => (
                <div role="cell" key={card.slug} className={cell}>
                  {detail.category.name}
                </div>
              ))}
            </CompareRow>
            {labels.map((label) => (
              <CompareRow key={label} label={label} cols={cols}>
                {columns.map(({ card, detail }) => (
                  <div role="cell" key={card.slug} className={cell}>
                    {valueOf(detail, label) ?? <span className="text-ink-muted">—</span>}
                  </div>
                ))}
              </CompareRow>
            ))}
            {columns.some(({ detail }) => detail.warrantyMonths) ? (
              <CompareRow label={t("warranty")} cols={cols}>
                {columns.map(({ card, detail }) => (
                  <div role="cell" key={card.slug} className={cell}>
                    {detail.warrantyMonths ? t("months", { count: detail.warrantyMonths, value: format.number(detail.warrantyMonths) }) : "—"}
                  </div>
                ))}
              </CompareRow>
            ) : null}
          </div>
        </div>
      ) : null}

      {columns.length ? <p className="mt-4 max-w-3xl text-sm text-ink-muted">{t("notice")}</p> : null}
    </StoreShell>
  );
}

function CompareRow({ label, cols, children }: { label: string; cols: React.CSSProperties; children: React.ReactNode }) {
  return (
    <div role="row" className="grid gap-px border-t border-line bg-line" style={cols}>
      <span role="rowheader" className="bg-surface-sunken px-3 py-3 text-sm text-ink-muted">
        {label}
      </span>
      {children}
    </div>
  );
}
