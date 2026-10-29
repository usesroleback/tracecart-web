import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  carriedFields,
  cleared,
  hasFilters,
  listingHref,
  ListingState,
  SORTS,
  withAttrValue,
  withBrand,
  withCondition,
  withDelivery,
  withoutAttr,
  withPage,
  withSort,
} from "@/lib/listingParams";
import { toMajor, type ProductListing } from "@/lib/store";
import { ProductList } from "./ProductCard";

type Facets = ProductListing["facets"];

const chip = (selected: boolean) =>
  `inline-flex items-center gap-2 rounded-[var(--radius-xs)] border px-2.5 py-1.5 text-sm ${
    selected ? "border-ink bg-ink text-ink-inverse" : "border-line bg-surface-raised text-ink hover:border-ink"
  }`;

function Check({ on }: { on: boolean }) {
  return (
    <span aria-hidden className={`grid size-4 shrink-0 place-items-center rounded-[3px] border ${on ? "border-ink bg-ink text-ink-inverse" : "border-line-strong"}`}>
      {on ? (
        <svg viewBox="0 0 12 12" className="size-3" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="m2.5 6.5 2.2 2L9.5 3.5" />
        </svg>
      ) : null}
    </span>
  );
}

function FacetLink({ href, on, label, count }: { href: string; on: boolean; label: string; count?: number }) {
  return (
    <li>
      <Link href={href} scroll={false} rel="nofollow" aria-current={on ? "true" : undefined} className="flex items-center gap-2.5 py-1.5 text-sm text-ink hover:underline">
        <Check on={on} />
        <span className="flex-1">{label}</span>
        {count !== undefined ? <span className="rb-mono-s text-ink-muted">{count}</span> : null}
      </Link>
    </li>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-line py-4 first:border-t-0 first:pt-0">
      <h3 className="rb-label mb-2 text-ink">{title}</h3>
      {children}
    </section>
  );
}

function Hidden({ fields }: { fields: [string, string][] }) {
  return (
    <>
      {fields.map(([n, v], i) => (
        <input key={`${n}-${i}`} type="hidden" name={n} value={v} />
      ))}
    </>
  );
}

/** A "from … to …" GET form that keeps every other filter. */
function RangeForm({
  action,
  fields,
  minName,
  maxName,
  min,
  max,
  placeholders,
  labels,
  step,
}: {
  action: string;
  fields: [string, string][];
  minName: string;
  maxName: string;
  min?: string;
  max?: string;
  placeholders: [string, string];
  labels: { from: string; to: string; apply: string };
  step: string;
}) {
  const input = "h-10 w-full min-w-0 rounded-[var(--radius-xs)] border border-line-strong bg-surface-raised px-2 text-sm text-ink";
  return (
    <form action={action} method="get" className="flex items-end gap-2">
      <Hidden fields={fields} />
      <label className="flex-1 text-xs text-ink-muted">
        {labels.from}
        <input type="number" inputMode="decimal" min="0" step={step} name={minName} defaultValue={min} placeholder={placeholders[0]} className={input} />
      </label>
      <label className="flex-1 text-xs text-ink-muted">
        {labels.to}
        <input type="number" inputMode="decimal" min="0" step={step} name={maxName} defaultValue={max} placeholder={placeholders[1]} className={input} />
      </label>
      <button type="submit" className="h-10 shrink-0 rounded-[var(--radius-xs)] border border-ink px-3 text-sm font-medium text-ink hover:bg-ink hover:text-ink-inverse">
        {labels.apply}
      </button>
    </form>
  );
}

async function FacetPanel({
  listing,
  state,
  path,
  action,
  currency,
  exponent,
  categoryHref,
  hideBrands,
}: {
  listing: ProductListing;
  state: ListingState;
  path: string;
  action: string;
  currency: string;
  exponent: number;
  categoryHref: (slug: string) => string;
  hideBrands?: boolean;
}) {
  const t = await getTranslations("store.listing");
  const f: Facets = listing.facets;
  const href = (s: ListingState) => listingHref(path, s);
  const valueLabel = (type: string, value: string, label: string, unit: string | null) =>
    type === "BOOLEAN" ? (value === "true" ? t("yes") : t("no")) : unit && type === "NUMBER" ? `${label} ${unit}` : label;

  return (
    <div>
      {f.categories.length ? (
        <Group title={t("categories")}>
          <ul>
            {f.categories.map((c) => (
              <li key={c.slug}>
                <Link href={categoryHref(c.slug)} className="flex items-center justify-between gap-2 py-1.5 text-sm text-ink hover:underline">
                  <span>{c.name}</span>
                  <span className="rb-mono-s text-ink-muted">{c.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Group>
      ) : null}

      {!hideBrands && f.brands.length > 1 ? (
        <Group title={t("brand")}>
          <ul>
            {f.brands.map((b) => (
              <FacetLink key={b.slug} href={href(withBrand(state, b.slug))} on={b.selected} label={b.name} count={b.count} />
            ))}
          </ul>
        </Group>
      ) : null}

      {f.price && f.price.max > f.price.min ? (
        <Group title={t("price", { currency })}>
          <RangeForm
            action={action}
            fields={carriedFields(state, (n) => n === "priceMin" || n === "priceMax")}
            minName="priceMin"
            maxName="priceMax"
            min={state.priceMin}
            max={state.priceMax}
            placeholders={[String(toMajor(f.price.min, currency)), String(toMajor(f.price.max, currency))]}
            labels={{ from: t("priceMin"), to: t("priceMax"), apply: t("apply") }}
            step={exponent > 0 ? "0.01" : "1"}
          />
        </Group>
      ) : null}

      {f.attributes.map((a) => (
        <Group key={a.key} title={a.unit && a.range ? `${a.label} (${a.unit})` : a.label}>
          {a.range ? (
            <RangeForm
              action={action}
              fields={carriedFields(state, (n, v) => n === "attr" && v.startsWith(`${a.key}:`))}
              minName={`min.${a.key}`}
              maxName={`max.${a.key}`}
              min={state.attr[a.key]?.min}
              max={state.attr[a.key]?.max}
              placeholders={[String(a.range.min), String(a.range.max)]}
              labels={{ from: t("priceMin"), to: t("priceMax"), apply: t("apply") }}
              step="any"
            />
          ) : (
            <ul>
              {a.values.map((v) => (
                <FacetLink key={v.value} href={href(withAttrValue(state, a.key, v.value))} on={v.selected} label={valueLabel(a.type, v.value, v.label, a.unit)} count={v.count} />
              ))}
            </ul>
          )}
        </Group>
      ))}

      {f.delivery.length ? (
        <Group title={t("delivery")}>
          <ul>
            {f.delivery.map((d) => (
              <FacetLink key={d.value} href={href(withDelivery(state, d.value))} on={d.selected} label={d.value === "local" ? t("deliveryLocal") : t("deliveryAbroad")} count={d.count} />
            ))}
          </ul>
        </Group>
      ) : null}

      {f.conditions.length > 1 ? (
        <Group title={t("condition")}>
          <ul>
            {f.conditions.map((c) => (
              <FacetLink key={c.value} href={href(withCondition(state, c.value))} on={c.selected} label={t(`conditions.${c.value as "NEW"}`)} count={c.count} />
            ))}
          </ul>
        </Group>
      ) : null}
    </div>
  );
}

/** The filters in force, each with a way to remove it. */
async function ActiveFilters({ listing, state, path, currency }: { listing: ProductListing; state: ListingState; path: string; currency: string }) {
  const t = await getTranslations("store.listing");
  if (!hasFilters(state)) return null;
  const href = (s: ListingState) => listingHref(path, s);
  const chips: { label: string; href: string }[] = [];
  for (const slug of state.brand) chips.push({ label: listing.facets.brands.find((b) => b.slug === slug)?.name ?? slug, href: href(withBrand(state, slug)) });
  for (const [key, a] of Object.entries(state.attr)) {
    const facet = listing.facets.attributes.find((f) => f.key === key);
    const name = facet?.label ?? key;
    if (a.values) {
      for (const v of a.values) {
        const label = facet?.values.find((x) => x.value === v)?.label ?? v;
        const shown = facet?.type === "BOOLEAN" ? (v === "true" ? t("yes") : t("no")) : facet?.unit && facet.type === "NUMBER" ? `${label} ${facet.unit}` : label;
        chips.push({ label: `${name}: ${shown}`, href: href(withAttrValue(state, key, v)) });
      }
    } else chips.push({ label: `${name}: ${t("range", { min: a.min ?? "…", max: a.max ?? "…" })}`, href: href(withoutAttr(state, key)) });
  }
  if (state.priceMin || state.priceMax) {
    chips.push({ label: `${t("price", { currency })}: ${t("range", { min: state.priceMin ?? "…", max: state.priceMax ?? "…" })}`, href: href({ ...state, priceMin: undefined, priceMax: undefined, page: undefined }) });
  }
  if (state.delivery) chips.push({ label: state.delivery === "local" ? t("deliveryLocal") : t("deliveryAbroad"), href: href(withDelivery(state, state.delivery)) });
  for (const c of state.condition) chips.push({ label: t(`conditions.${c as "NEW"}`), href: href(withCondition(state, c)) });

  return (
    <ul className="mb-4 flex flex-wrap items-center gap-2">
      {chips.map((c) => (
        <li key={c.href + c.label}>
          <Link href={c.href} scroll={false} rel="nofollow" className={chip(true)} aria-label={t("remove", { filter: c.label })}>
            {c.label}
            <span aria-hidden>×</span>
          </Link>
        </li>
      ))}
      <li>
        <Link href={href(cleared(state))} scroll={false} className="text-sm text-ink underline">
          {t("clear")}
        </Link>
      </li>
    </ul>
  );
}

async function Pagination({ listing, state, path }: { listing: ProductListing; state: ListingState; path: string }) {
  const t = await getTranslations("store.listing");
  const pages = Math.max(1, Math.ceil(listing.total / listing.pageSize));
  if (pages <= 1) return null;
  const page = listing.page;
  const around = [...new Set([1, page - 1, page, page + 1, pages])].filter((p) => p >= 1 && p <= pages).sort((a, b) => a - b);
  const link = "grid h-10 min-w-10 place-items-center rounded-[var(--radius-xs)] border px-3 text-sm";
  return (
    <nav aria-label={t("pagination")} className="mt-8 flex flex-wrap items-center justify-center gap-2">
      {page > 1 ? (
        <Link href={listingHref(path, withPage(state, page - 1))} rel="prev" className={`${link} border-line hover:border-ink`}>
          {t("previous")}
        </Link>
      ) : null}
      {around.map((p, i) => (
        <span key={p} className="flex items-center gap-2">
          {i > 0 && p - around[i - 1] > 1 ? <span aria-hidden className="text-ink-muted">…</span> : null}
          <Link
            href={listingHref(path, withPage(state, p))}
            aria-current={p === page ? "page" : undefined}
            aria-label={t("page", { page: p, pages })}
            className={`${link} ${p === page ? "border-ink bg-ink text-ink-inverse" : "border-line hover:border-ink"}`}
          >
            {p}
          </Link>
        </span>
      ))}
      {page < pages ? (
        <Link href={listingHref(path, withPage(state, page + 1))} rel="next" className={`${link} border-line hover:border-ink`}>
          {t("next")}
        </Link>
      ) : null}
    </nav>
  );
}

/**
 * A category, brand or search page: heading, filters (a sidebar on large
 * screens, a fold-out on phones), sort, the products and the pages. Every
 * control is a link or a GET form: it works before any JavaScript arrives.
 */
export async function ListingView({
  listing,
  state,
  path,
  locale,
  heading,
  intro,
  currency,
  exponent,
  categoryHref,
  hideBrands,
  empty,
}: {
  listing: ProductListing;
  state: ListingState;
  /** The page's path without the locale: "/c/power-tools". */
  path: string;
  locale: string;
  heading: ReactNode;
  intro?: ReactNode;
  currency: string;
  exponent: number;
  categoryHref: (slug: string) => string;
  hideBrands?: boolean;
  /** Shown when nothing matches. */
  empty: ReactNode;
}) {
  const t = await getTranslations("store.listing");
  const action = `/${locale}${path}`;
  const panel = (
    <FacetPanel listing={listing} state={state} path={path} action={action} currency={currency} exponent={exponent} categoryHref={categoryHref} hideBrands={hideBrands} />
  );
  // Without a query, "relevance" lists the cheapest first: shown as such.
  const sort = state.sort ?? (state.q ? "relevance" : "price_asc");
  const sorts = SORTS.filter((s) => s !== "relevance" || state.q);

  return (
    <div>
      {heading}
      {intro}
      <div className="mt-6 grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside aria-label={t("filters")} className="hidden lg:block">
          {panel}
        </aside>
        <div className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-ink-muted" aria-live="polite">
              {state.q ? t("resultsFor", { count: listing.total, query: state.q }) : t("results", { count: listing.total })}
            </p>
            <nav aria-label={t("sort")} className="flex flex-wrap items-center gap-1.5 text-sm">
              <span className="text-ink-muted">{t("sort")}:</span>
              {sorts.map((s) => (
                <Link key={s} href={listingHref(path, withSort(state, s))} scroll={false} rel="nofollow" aria-current={sort === s ? "true" : undefined} className={chip(sort === s)}>
                  {t(`sorts.${s}`)}
                </Link>
              ))}
            </nav>
          </div>
          <details className="mb-4 rounded-[var(--radius-s)] border border-line bg-surface-raised lg:hidden">
            <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-ink">{t("showFilters")}</summary>
            <div className="border-t border-line px-4 py-4">{panel}</div>
          </details>
          <ActiveFilters listing={listing} state={state} path={path} currency={currency} />
          {listing.correctedQuery && state.q ? (
            <p className="mb-4 rounded-[var(--radius-s)] bg-surface-sunken px-4 py-3 text-sm text-ink">{t("corrected", { corrected: listing.correctedQuery, query: state.q })}</p>
          ) : null}
          {listing.truncated ? <p className="mb-4 text-sm text-ink-muted">{t("truncated")}</p> : null}
          {listing.items.length ? <ProductList products={listing.items} priorityFirst={2} /> : empty}
          <Pagination listing={listing} state={state} path={path} />
        </div>
      </div>
    </div>
  );
}
