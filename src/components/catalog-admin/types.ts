// The back office's catalogue as /admin/catalog/* returns it (those routes
// document no response shapes yet, so these mirror the API's models).

export type L = { fr?: string; en?: string } | null;

export const pick = (l: L | undefined, locale: string) => (locale === "fr" ? (l?.fr ?? l?.en) : (l?.en ?? l?.fr)) ?? "";

export type ProductStatus = "DRAFT" | "IN_REVIEW" | "ACTIVE" | "ARCHIVED";
export type OfferStatus = "DRAFT" | "IN_REVIEW" | "ACTIVE" | "PAUSED" | "DELISTED";
export type FulfillmentType = "TRACECART_STOCK" | "SELLER_FULFILLED" | "FULFILLED_BY_TRACECART" | "CROSS_BORDER";
export const PRODUCT_STATUSES: ProductStatus[] = ["DRAFT", "IN_REVIEW", "ACTIVE", "ARCHIVED"];
export const OFFER_STATUSES: OfferStatus[] = ["DRAFT", "IN_REVIEW", "ACTIVE", "PAUSED", "DELISTED"];
export const FULFILLMENT_TYPES: FulfillmentType[] = ["TRACECART_STOCK", "SELLER_FULFILLED", "FULFILLED_BY_TRACECART", "CROSS_BORDER"];
export const LINK_KINDS = ["FITS", "CHARGES", "REPLACES", "ACCESSORY_FOR", "CONSUMABLE_FOR", "FREQUENTLY_BOUGHT_WITH"] as const;

export interface AttributeDefinition {
  id: string;
  categoryId: string;
  key: string;
  label: L;
  type: "NUMBER" | "ENUM" | "BOOLEAN" | "TEXT";
  unit: string | null;
  options: { value: string; label: L }[] | null;
  filterable: boolean;
  searchable: boolean;
  required: boolean;
  position: number;
}

export interface AdminCategory {
  id: string;
  slug: string;
  parentId: string | null;
  name: L;
  active: boolean;
  position: number;
  productCount: number;
  attributes: AttributeDefinition[];
}

export interface References {
  warehouses: { id: string; code: string; name: string; type: string; countryCode: string; city: string; organizationId: string | null }[];
  sellers: { id: string; name: string }[];
  suppliers: { id: string; name: string }[];
  brands: { id: string; slug: string; name: string }[];
  categories: { id: string; slug: string; name: L; parentId: string | null; active: boolean }[];
}

export interface AdminOffer {
  id: string;
  fulfillmentType: FulfillmentType;
  status: OfferStatus;
  condition: string;
  priceMinor: number | null;
  currency: string;
  compareAtMinor: number | null;
  handlingDays: number;
  sourcePriceMinor: number | null;
  sourceCurrency: string | null;
  sourceUrl: string | null;
  leadTimeDaysMin: number | null;
  leadTimeDaysMax: number | null;
  seller: { id: string; name: string } | null;
  sourceSupplier: { id: string; name: string } | null;
  warehouse: { id: string; code: string; name: string; countryCode: string; city: string } | null;
}

export interface AdminVariant {
  id: string;
  sku: string;
  options: Record<string, string>;
  mpn: string | null;
  gtin: string | null;
  weightGrams: number | null;
  active: boolean;
  offers: AdminOffer[];
  stock: { onHand: number; reserved: number; warehouse: { code: string; name: string } }[];
  compatibleTo: { id: string; kind: string; to: { sku: string; product: { slug: string; title: L } } }[];
}

export interface AdminProduct {
  id: string;
  slug: string;
  status: ProductStatus;
  categoryId: string;
  brandId: string | null;
  title: L;
  description: L;
  attributes: Record<string, unknown>;
  warrantyMonths: number | null;
  updatedAt: string;
  media: { id: string; kind: string; url: string; role: string | null; variant: { sku: string } | null }[];
  variants: AdminVariant[];
  definitions: AttributeDefinition[];
}

export const STATUS_BADGE: Record<string, "positive" | "attn" | "default" | "critical" | "info"> = {
  ACTIVE: "positive",
  DRAFT: "default",
  IN_REVIEW: "info",
  ARCHIVED: "critical",
  PAUSED: "attn",
  DELISTED: "critical",
};

/** "a=1\nb=2" → { a: "1", b: "2" } */
export function parsePairs(text: string): Record<string, string> {
  return Object.fromEntries(
    text
      .split("\n")
      .map((l) => l.split("="))
      .filter(([k, ...v]) => k?.trim() && v.join("=").trim())
      .map(([k, ...v]) => [k.trim(), v.join("=").trim()]),
  );
}

/** Categories as "Parent › Child" labels, in tree order, for a select. */
export function categoryOptions(categories: { id: string; name: L; parentId: string | null }[], locale: string) {
  const children = new Map<string | null, typeof categories>();
  for (const c of categories) children.set(c.parentId, [...(children.get(c.parentId) ?? []), c]);
  const out: { id: string; label: string }[] = [];
  const walk = (parent: string | null, prefix: string) => {
    for (const c of children.get(parent) ?? []) {
      const label = prefix ? `${prefix} › ${pick(c.name, locale)}` : pick(c.name, locale);
      out.push({ id: c.id, label });
      walk(c.id, label);
    }
  };
  walk(null, "");
  return out;
}

/** The attributes a category's products have: its own and those above it (nearest wins). */
export function definitionsFor(categories: AdminCategory[], categoryId: string): AttributeDefinition[] {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const chain: AdminCategory[] = [];
  for (let c = byId.get(categoryId); c && chain.length < 10; c = c.parentId ? byId.get(c.parentId) : undefined) chain.unshift(c);
  const byKey = new Map<string, AttributeDefinition>();
  for (const c of chain) for (const a of [...c.attributes].sort((x, y) => x.position - y.position)) byKey.set(a.key, a);
  return [...byKey.values()];
}
