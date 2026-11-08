import type { Breakdown, PaymentMethod } from "@/components/checkout/types";

// What the AI search, freight and quote routes return (they document no response shapes yet).

export type Reason =
  | { key: "identifier"; code: string }
  | { key: "brand"; brand: string }
  | { key: "category"; category: string }
  | { key: "attribute"; label: string; value: string; unit: string | null }
  | { key: "words" }
  | { key: "looksLike" };

export type Chip =
  | { kind: "category"; slug: string; label: string; count: number }
  | { kind: "brand"; slug: string; label: string; count: number }
  | { kind: "attribute"; category: string; key: string; value: string; label: string };

export interface AiResult {
  id: string;
  slug: string;
  title: string;
  brand: { slug: string; name: string } | null;
  image: { url: string; alt: string } | null;
  price: { amountMinor: number; currency: string };
  compareAtMinor: number | null;
  availability: { kind: "IN_STOCK" | "SELLER" | "ABROAD" | "OUT_OF_STOCK"; city: string | null; countryCode: string | null; local: boolean; days: { min: number; max: number } };
  variantCount: number;
  reasons: Reason[];
}

export interface AiSearchResult {
  searchId: string;
  understood: {
    title: string | null;
    brand: string | null;
    model: string | null;
    category: { slug: string; name: string } | null;
    attributes: { name: string; value: string; unit: string | null }[];
    identification: string;
  } | null;
  aiUsed: boolean;
  vectorUsed: boolean;
  limited: boolean;
  notAProduct: boolean;
  needsDescription: boolean;
  items: AiResult[];
  chips: Chip[];
  /** Which did the reading and the ranking: the API, or Tracey (ADR-079). */
  engine?: { extraction: "api" | "tracey"; ranking: "api" | "tracey" };
  /** At most two questions that would narrow it down, in the shopper's language (Tracey only, for now). */
  clarifications?: { key: string; question: string; options: { value: string; label: string }[] }[];
}

export interface CargoEstimate {
  summary: string;
  items: { description: string; quantity: number; category: string | null }[];
  packageCount: number;
  weightKg: { low: number; high: number };
  largestPackageCm: { length: number; width: number; height: number } | null;
  volumeM3: number | null;
  careFlags: { kind: string; reason: string }[];
  restricted: { item: string; reason: string }[];
  confidence: "high" | "medium" | "low";
  assumptions: string[];
  missingInformation: string[];
}

export interface Indicative {
  currency: string;
  available: boolean;
  problems: string[];
  low: Breakdown | null;
  high: Breakdown | null;
  promise: { from: string; to: string } | null;
  crossBorder: boolean;
  dutiesIncluded: boolean;
}

export interface FreightEstimate {
  available: boolean;
  status: "NONE" | "DONE" | "FAILED";
  notGoods: boolean;
  estimate: CargoEstimate | null;
  indicative: Indicative | null;
}

export interface FreightPlace {
  countryCode: string;
  city: string;
  addressLine?: string;
  landmark?: string;
  contactName?: string;
  phone?: string;
}

export interface CustomerQuote {
  reference: string;
  kind: "SOURCING" | "FREIGHT";
  status: "SENT" | "ACCEPTED" | "DECLINED" | "EXPIRED" | "WITHDRAWN";
  title: string;
  quantity: number;
  currency: string;
  totals: Breakdown;
  destination: { method: "HOME" | "PICKUP"; countryCode: string; city: string };
  promise: { from: string; to: string };
  validUntil: string;
  note: string | null;
  createdAt: string;
  request: { kind: "FREIGHT" | "SOURCING"; reference: string | null; description: string };
  order: { reference: string; status: string } | null;
  paymentMethods?: { method: PaymentMethod; available: boolean; blockers: string[] }[];
}

export interface FreightRequestView {
  reference: string;
  status: "SUBMITTED" | "QUOTED" | "ACCEPTED" | "CANCELLED" | "CLOSED";
  createdAt: string;
  origin: FreightPlace;
  destination: FreightPlace;
  readyOn: string | null;
  description: string;
  declaredValueMinor: number | null;
  currency: string;
  mediaCount: number;
  estimateStatus: "NONE" | "DONE" | "FAILED";
  estimate: CargoEstimate | null;
  indicative: Indicative | null;
  quotes: CustomerQuote[];
}

export interface FreightListItem {
  reference: string;
  status: FreightRequestView["status"];
  createdAt: string;
  description: string;
  from: string;
  to: string;
  currency: string;
  openQuote: { reference: string; status: string; totalMinor: number; validUntil: string } | null;
}
