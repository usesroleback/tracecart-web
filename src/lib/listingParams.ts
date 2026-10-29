// A listing page's address carries its filters, in the API's own form
// (GET /catalog/products): ?q=…&brand=a&brand=b&attr=voltage:18,36&priceMax=…
// Every filter is a plain link, so a page filters without JavaScript, can be
// shared, and stays cacheable.

export type SearchParams = Record<string, string | string[] | undefined>;

export const SORTS = ["relevance", "price_asc", "price_desc", "newest"] as const;
export type Sort = (typeof SORTS)[number];

export interface ListingState {
  q?: string;
  /** The search page narrowed to a category (category pages have it in their path). */
  category?: string;
  brand: string[];
  /** key → chosen values, or a range. */
  attr: Record<string, { values?: string[]; min?: string; max?: string }>;
  /** In the currency's major units, as typed: 45000 XOF, 19.99 EUR. */
  priceMin?: string;
  priceMax?: string;
  delivery?: "local" | "abroad";
  condition: string[];
  sort?: Sort;
  page?: number;
}

const list = (v: string | string[] | undefined) => (v === undefined ? [] : Array.isArray(v) ? v : [v]);
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;
const amount = (v: string | undefined) => (v && /^[0-9]+(\.[0-9]{1,2})?$/.test(v.trim()) ? v.trim() : undefined);
const numberish = (v: string | undefined) => (v && /^-?[0-9]+(\.[0-9]+)?$/.test(v.trim()) ? v.trim() : undefined);

export function parseListing(sp: SearchParams): ListingState {
  const attr: ListingState["attr"] = {};
  for (const item of list(sp.attr)) {
    const at = item.indexOf(":");
    if (at <= 0) continue;
    const key = item.slice(0, at);
    const rest = item.slice(at + 1);
    const range = /^([0-9.]*)\.\.([0-9.]*)$/.exec(rest);
    if (range) attr[key] = { min: range[1] || undefined, max: range[2] || undefined };
    else attr[key] = { values: [...new Set([...(attr[key]?.values ?? []), ...rest.split(",").filter(Boolean)])] };
  }
  // A range form sends min.<key> and max.<key>.
  for (const [name, raw] of Object.entries(sp)) {
    const m = /^(min|max)\.([a-z][a-z0-9_]*)$/.exec(name);
    const v = numberish(one(raw));
    if (!m || !v) continue;
    attr[m[2]] = { ...(attr[m[2]]?.values ? {} : attr[m[2]]), [m[1]]: v };
  }
  const delivery = one(sp.delivery);
  const category = one(sp.category);
  const sort = one(sp.sort) as Sort | undefined;
  const page = Number(one(sp.page));
  return {
    q: one(sp.q)?.trim().slice(0, 200) || undefined,
    category: category && /^[a-z0-9-]+$/.test(category) ? category : undefined,
    brand: list(sp.brand).filter((b) => /^[a-z0-9-]+$/.test(b)),
    attr,
    priceMin: amount(one(sp.priceMin)),
    priceMax: amount(one(sp.priceMax)),
    delivery: delivery === "local" || delivery === "abroad" ? delivery : undefined,
    condition: list(sp.condition).filter((c) => ["NEW", "REFURBISHED", "USED"].includes(c)),
    sort: sort && SORTS.includes(sort) ? sort : undefined,
    page: Number.isInteger(page) && page > 1 && page <= 500 ? page : undefined,
  };
}

function attrParams(attr: ListingState["attr"]): string[] {
  return Object.entries(attr).flatMap(([key, a]) => {
    if (a.values?.length) return [`${key}:${a.values.join(",")}`];
    if (a.min || a.max) return [`${key}:${a.min ?? ""}..${a.max ?? ""}`];
    return [];
  });
}

/** The API's query for this state (without the store's country and currency); prices go in minor units. */
export function apiQuery(s: ListingState, exponent: number) {
  const minor = (v: string | undefined) => (v ? Math.round(Number(v) * 10 ** exponent) : undefined);
  return {
    q: s.q,
    category: s.category,
    brand: s.brand.length ? s.brand : undefined,
    attr: attrParams(s.attr).length ? attrParams(s.attr) : undefined,
    priceMin: minor(s.priceMin),
    priceMax: minor(s.priceMax),
    delivery: s.delivery,
    condition: s.condition.length ? (s.condition as ("NEW" | "REFURBISHED" | "USED")[]) : undefined,
    sort: s.sort,
    page: s.page,
  };
}

/** The address of a state: the same page, other filters. */
export function listingHref(pathname: string, s: ListingState): string {
  const query = listingSearch(s).toString();
  return query ? `${pathname}?${query}` : pathname;
}

function listingSearch(s: ListingState): URLSearchParams {
  const p = new URLSearchParams();
  if (s.q) p.set("q", s.q);
  if (s.category) p.set("category", s.category);
  for (const b of s.brand) p.append("brand", b);
  for (const a of attrParams(s.attr)) p.append("attr", a);
  if (s.priceMin) p.set("priceMin", s.priceMin);
  if (s.priceMax) p.set("priceMax", s.priceMax);
  if (s.delivery) p.set("delivery", s.delivery);
  for (const c of s.condition) p.append("condition", c);
  if (s.sort && s.sort !== "relevance") p.set("sort", s.sort);
  if (s.page && s.page > 1) p.set("page", String(s.page));
  return p;
}

/**
 * What a GET form must carry along so submitting it keeps the other filters:
 * every parameter of the state but the ones the form sets.
 */
export function carriedFields(s: ListingState, drop: (name: string, value: string) => boolean): [string, string][] {
  return [...listingSearch({ ...s, page: undefined }).entries()].filter(([n, v]) => !drop(n, v));
}

/** A filter changed: back to the first page. */
const reset = (s: ListingState, change: Partial<ListingState>): ListingState => ({ ...s, ...change, page: undefined });

const toggle = (values: string[], v: string) => (values.includes(v) ? values.filter((x) => x !== v) : [...values, v]);

export const withBrand = (s: ListingState, slug: string) => reset(s, { brand: toggle(s.brand, slug) });

export function withAttrValue(s: ListingState, key: string, value: string): ListingState {
  const values = toggle(s.attr[key]?.values ?? [], value);
  const attr = { ...s.attr };
  if (values.length) attr[key] = { values };
  else delete attr[key];
  return reset(s, { attr });
}

export const withDelivery = (s: ListingState, d: "local" | "abroad") => reset(s, { delivery: s.delivery === d ? undefined : d });
export const withCondition = (s: ListingState, c: string) => reset(s, { condition: toggle(s.condition, c) });
export const withSort = (s: ListingState, sort: Sort) => reset(s, { sort });
export const withPage = (s: ListingState, page: number) => ({ ...s, page });

export function withoutAttr(s: ListingState, key: string): ListingState {
  const attr = { ...s.attr };
  delete attr[key];
  return reset(s, { attr });
}

/** Everything but the query: "Clear filters". */
export const cleared = (s: ListingState): ListingState => ({ q: s.q, category: s.category, brand: [], attr: {}, condition: [], sort: s.sort });

export const withCategory = (s: ListingState, slug: string | undefined): ListingState => ({ ...cleared(s), category: slug });

export const hasFilters = (s: ListingState) =>
  s.brand.length > 0 || Object.keys(s.attr).length > 0 || !!s.priceMin || !!s.priceMax || !!s.delivery || s.condition.length > 0;
