export type Role = "SUPER_ADMIN" | "LOGISTICS_PARTNER" | "CUSTOMER";

export type Locale = "fr" | "en";

export type OrderStatus =
  | "INTENT_SUBMITTED"
  | "QUOTING"
  | "QUOTED"
  | "QUOTE_SENT"
  | "PAID"
  | "PURCHASED"
  | "RECEIVED_HUB"
  | "CONFIRMED_HUB"
  | "PICKED_UP"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "DECLINED"
  | "UNAVAILABLE";

export type VolumeTier = "SMALL_UNITS" | "MID_QUANTITY" | "LARGE_STOCK";

// The main path through the lifecycle — used to render the corridor tracker.
// DECLINED/UNAVAILABLE are terminal off-ramps, shown separately (see Status).
export const STATUS_SEQUENCE: OrderStatus[] = [
  "INTENT_SUBMITTED",
  "QUOTING",
  "QUOTED",
  "QUOTE_SENT",
  "PAID",
  "PURCHASED",
  "RECEIVED_HUB",
  "CONFIRMED_HUB",
  "PICKED_UP",
  "IN_TRANSIT",
  "DELIVERED",
];

// Admin can move an order to most statuses manually (a required note is
// enforced server-side); QUOTE_SENT and PAID only happen via their dedicated
// actions. The partner can only advance its own shipping leg.
export const ADMIN_MANUAL_TARGETS: OrderStatus[] = [
  "INTENT_SUBMITTED",
  "QUOTING",
  "QUOTED",
  "PURCHASED",
  "RECEIVED_HUB",
  "CONFIRMED_HUB",
  "DECLINED",
  "UNAVAILABLE",
];

export const PARTNER_SEQUENCE: OrderStatus[] = ["CONFIRMED_HUB", "PICKED_UP", "IN_TRANSIT", "DELIVERED"];

export const PARTNER_NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  CONFIRMED_HUB: "PICKED_UP",
  PICKED_UP: "IN_TRANSIT",
  IN_TRANSIT: "DELIVERED",
};

export interface Hub {
  id: string;
  name: string;
  city: string;
  country: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  timezone: string;
  currency: string;
  isActive: boolean;
  notes: string | null;
}

export interface Provider {
  id: string;
  name: string;
  slug: string;
  domains: string[];
  type: "LOCAL_MARKETPLACE" | "INTERNATIONAL";
  defaultCurrency: string;
  logoUrl: string | null;
  isActive: boolean;
  notes: string | null;
}

export interface OrderUserRef {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
}

export interface LogisticsQuoteLineItem {
  label: string;
  amount: number;
}

export interface LogisticsQuote {
  id: string;
  orderId: string;
  submittedByUserId: string;
  amount: string;
  currency: string;
  lineItems: LogisticsQuoteLineItem[];
  note: string | null;
  status: "SUBMITTED" | "ACCEPTED" | "REVISED";
  createdAt: string;
}

export type IntakeType = "BUY_ON_BEHALF" | "CUSTOMER_OWNED";
export type LocationSource = "MANUAL" | "GPS";

export interface OrderPhoto {
  id: string;
  url: string;
  originalName: string | null;
  /** GOODS: the goods themselves; PROOF_OF_DELIVERY: the handover, from the carrier. */
  kind: "GOODS" | "PROOF_OF_DELIVERY";
  createdAt: string;
}

export interface LocationUpdate {
  id: string;
  source: LocationSource;
  city: string | null;
  note: string | null;
  latitude: number | null;
  longitude: number | null;
  recordedAt: string;
  reportedByUserId: string;
}

// Price fields (productCost, currency, platformFee, customerQuoteTotal,
// paymentStatus, paidAt) are only ever present for SUPER_ADMIN — the API
// omits them entirely from the partner-facing serialization (§3, enforced
// server-side). They're typed optional here to reflect that.
export interface Order {
  id: string;
  reference: string;
  quoteToken?: string;
  hubId: string;
  hub: Hub;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  customerLocale: Locale;
  destinationCity: string;
  destinationCountry: string;
  providerId: string | null;
  provider: Provider | null;
  intakeType: IntakeType;
  productName: string;
  productUrl: string | null;
  productImageUrl: string | null;
  quantity: number;
  volumeTier: VolumeTier;
  productCost?: string | null;
  currency?: string | null;
  logisticsCost: string | null;
  platformFee?: string | null;
  customerQuoteTotal?: number | null;
  paymentStatus?: "UNPAID" | "PAID";
  paidAt?: string | null;
  /** When the customer accepted the current quote via their link (admin view only). */
  quoteAcceptedAt?: string | null;
  notes?: string | null;
  status: OrderStatus;
  createdByUserId?: string;
  createdByUser?: OrderUserRef;
  assignedPartnerId: string | null;
  assignedPartner: OrderUserRef | null;
  logisticsQuote: LogisticsQuote | null;
  photos: OrderPhoto[];
  locationUpdates: LocationUpdate[];
  // Shipment details (docs/design/concepts-and-domain-model.md). Decimals arrive as strings.
  productCategory: string | null;
  packageCount: number | null;
  lengthCm: string | null;
  widthCm: string | null;
  heightCm: string | null;
  grossWeightKg: string | null;
  /** Admin view only. */
  declaredValue?: string | null;
  declaredValueCurrency?: string | null;
  handlingFlags: HandlingFlag[];
  readyAt: string | null;
  requiredBy: string | null;
  requiredByIsHard: boolean;
  complianceStatus: ComplianceStatus;
  complianceNote?: string | null;
  /** Carriers get every address but the billing one. */
  addresses: OrderAddress[];
  /** Admin view: the whole customs case. */
  customsCase?: CustomsCase | null;
  /** Carrier view: who handles customs and where it stands, no amounts. */
  customs?: Pick<CustomsCase, "responsibility" | "status" | "documentsNote"> | null;
  /** Admin view only: every version sent, latest first. */
  customerQuotes?: CustomerQuote[];
  /** Estimated arrival window; the original is the first one ever given. */
  etaFrom: string | null;
  etaTo: string | null;
  originalEtaFrom: string | null;
  originalEtaTo: string | null;
  /** Newest first. */
  shipmentEvents: ShipmentEvent[];
  /** Newest first. */
  exceptions: OrderException[];
  createdAt: string;
  updatedAt: string;
}

export const MILESTONES = [
  "PICKUP_SCHEDULED",
  "PICKUP_COMPLETED",
  "ORIGIN_HUB_RECEIVED",
  "INSPECTION_COMPLETED",
  "DISPATCHED",
  "BORDER_PROCESSING",
  "CUSTOMS_DOCUMENTS_REQUIRED",
  "CUSTOMS_CLEARANCE_STARTED",
  "CUSTOMS_CLEARED",
  "DELAY_REPORTED",
  "ETA_REVISED",
  "DESTINATION_HUB_RECEIVED",
  "OUT_FOR_DELIVERY",
  "DELIVERY_ATTEMPT_FAILED",
  "RETURN_STARTED",
] as const;
export type Milestone = (typeof MILESTONES)[number];

export interface ShipmentEvent {
  id: string;
  milestone: Milestone;
  source: "STAFF" | "CARRIER" | "INTEGRATION";
  occurredAt: string;
  recordedAt: string;
  city: string | null;
  customerNote: string | null;
  internalNote: string | null;
  reason: string | null;
  etaFrom: string | null;
  etaTo: string | null;
  externalRef: string | null;
}

export const EXCEPTION_TYPES = [
  "DELAY",
  "STALE_TRACKING",
  "PICKUP_FAILED",
  "CARGO_DISCREPANCY",
  "HUB_REJECTED",
  "BOOKING_FAILED",
  "CUSTOMS_DOCUMENTS_MISSING",
  "CUSTOMS_HOLD",
  "DAMAGED_OR_MISSING",
  "DELIVERY_FAILED",
  "PRICE_CHANGED",
  "OTHER",
] as const;
export type ExceptionType = (typeof EXCEPTION_TYPES)[number];
export type ExceptionSeverity = "LOW" | "MEDIUM" | "HIGH";

/** Carriers get the working fields only (no owner, impact or resolution notes). */
export interface OrderException {
  id: string;
  type: ExceptionType;
  severity: ExceptionSeverity;
  status: "OPEN" | "RESOLVED";
  summary: string;
  nextAction: string | null;
  dueAt: string | null;
  createdAt: string;
  resolvedAt: string | null;
  customerImpact?: string | null;
  ownerUserId?: string | null;
  resolution?: string | null;
}

/** GET /exceptions: the hub's exceptions with their order. */
export interface HubException extends OrderException {
  order: { id: string; reference: string; status: OrderStatus; customerName: string; destinationCity: string; productName: string };
  owner: { id: string; name: string } | null;
}

export const HANDLING_FLAGS = ["BATTERY", "LIQUID", "TEMPERATURE_SENSITIVE", "FRAGILE", "MEDICAL_DEVICE", "DANGEROUS_GOODS"] as const;
export type HandlingFlag = (typeof HANDLING_FLAGS)[number];
export type ComplianceStatus = "NOT_REQUIRED" | "REVIEW_REQUIRED" | "APPROVED" | "BLOCKED";

export const ADDRESS_KINDS = ["PICKUP", "SUPPLIER_ORIGIN", "DELIVERY", "BILLING"] as const;
export type AddressKind = (typeof ADDRESS_KINDS)[number];

export interface OrderAddress {
  id: string;
  kind: AddressKind;
  contactName: string | null;
  phone: string | null;
  line1: string;
  line2: string | null;
  city: string;
  region: string | null;
  postalCode: string | null;
  country: string;
  notes: string | null;
}

export const CUSTOMS_RESPONSIBILITIES = ["UNKNOWN", "TRACECART_COORDINATES", "CUSTOMER_HANDLES", "ALREADY_CLEARED"] as const;
export type CustomsResponsibility = (typeof CUSTOMS_RESPONSIBILITIES)[number];
export const CUSTOMS_STATUSES = ["NOT_STARTED", "DOCUMENTS_REQUIRED", "IN_PROGRESS", "HELD", "CLEARED", "NOT_APPLICABLE"] as const;
export type CustomsStatus = (typeof CUSTOMS_STATUSES)[number];

export interface CustomsCase {
  responsibility: CustomsResponsibility;
  status: CustomsStatus;
  currency: string | null;
  estimatedDuties: string | null;
  officialAssessment: string | null;
  brokerFee: string | null;
  hsCodeProposal: string | null;
  classificationReviewed: boolean;
  originCountry: string | null;
  documentsNote: string | null;
  notes: string | null;
}

export const PRICE_COMPONENTS = [
  "PICKUP",
  "HUB_HANDLING",
  "STORAGE",
  "INSURANCE",
  "FINAL_MILE",
  "SPECIAL_HANDLING",
  "LOGISTICS_COORDINATION_FEE",
  "CUSTOMS_COORDINATION_FEE",
] as const;
export type PriceComponent = (typeof PRICE_COMPONENTS)[number];
export const PRICE_METHODS = ["FIXED", "PER_UNIT", "PER_PACKAGE", "PER_KG", "PERCENT_OF_PRODUCT", "PERCENT_OF_DECLARED_VALUE"] as const;
export type PriceMethod = (typeof PRICE_METHODS)[number];
export type QuoteLineComponent = PriceComponent | "PRODUCT" | "TRANSPORT" | "PLATFORM_FEE" | "CUSTOMS_DUTIES" | "CUSTOMS_BROKER";

/** One line of a priced quote (apps/api modules/pricing/engine.ts). */
export interface QuoteLine {
  component: QuoteLineComponent;
  amount: number;
  revenue: boolean;
  basis: "CONFIRMED" | "ESTIMATED";
  rule?: { id: string; code: string; version: number; method: PriceMethod; rateSource: string | null };
  description?: string | null;
}

/** What a quote assumes or leaves out, as a code to put into words. */
export interface QuoteNote {
  kind: "assumption" | "exclusion";
  code: string;
  params?: Record<string, string | number>;
}

export interface PricedQuote {
  lines: QuoteLine[];
  notes: QuoteNote[];
  total: number;
  provisional: boolean;
  currency: string;
}

export interface CustomerQuote {
  id: string;
  version: number;
  status: "SENT" | "ACCEPTED" | "DECLINED" | "SUPERSEDED" | "EXPIRED";
  currency: string;
  total: number;
  lineItems: QuoteLine[];
  notes: QuoteNote[];
  provisional: boolean;
  validUntil: string;
  decidedAt: string | null;
  createdAt: string;
}

export interface PricingRule {
  id: string;
  code: string;
  version: number;
  active: boolean;
  component: PriceComponent;
  method: PriceMethod;
  amount: string;
  minAmount: string | null;
  maxAmount: string | null;
  currency: string;
  priority: number;
  hubId: string | null;
  destinationCountry: string | null;
  intakeType: IntakeType | null;
  productCategory: string | null;
  handlingFlag: HandlingFlag | null;
  minWeightKg: string | null;
  maxWeightKg: string | null;
  minQuantity: number | null;
  maxQuantity: number | null;
  effectiveFrom: string;
  effectiveUntil: string | null;
  rateSource: string | null;
  lastVerifiedAt: string | null;
  description: string | null;
  createdAt: string;
}

export interface OrderHistoryEntry {
  id: string;
  orderId: string;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  changedByUser: { id: string; name: string; role: Role };
  note: string | null;
  createdAt: string;
}

export interface Notification {
  id: string;
  recipientUserId: string;
  orderId: string | null;
  channel: "IN_APP" | "EMAIL" | "SMS";
  title: string;
  body: string;
  status: "PENDING" | "SENT" | "FAILED" | "READ";
  createdAt: string;
  sentAt: string | null;
  order?: { id: string; reference: string; status: OrderStatus } | null;
}

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  /** The language their notifications are written in (kept in step with the console's). */
  locale: Locale;
  hubId: string | null;
  hub: { id: string; name: string; city: string; country: string; currency: string } | null;
}

export type ReservationStatus = "RESERVED" | "CONVERTED";

export interface Reservation {
  id: string;
  hubId: string;
  reservedByUser: { id: string; name: string };
  providerId: string | null;
  provider: Provider | null;
  externalId: string | null;
  url: string;
  title: string | null;
  imageUrl: string | null;
  price: string | null;
  currency: string | null;
  status: ReservationStatus;
  orderId: string | null;
  order: { id: string; reference: string; status: OrderStatus } | null;
  createdAt: string;
  updatedAt: string;
}

export type SourcingRequestStatus = "OPEN" | "MATCHED" | "CONVERTED" | "CLOSED";

export interface SourcingRequest {
  id: string;
  hubId: string;
  requestedByUser: { id: string; name: string };
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  description: string;
  category: string | null;
  brand: string | null;
  model: string | null;
  partNumber: string | null;
  productUrl: string | null;
  budgetMin: string | null;
  budgetMax: string | null;
  quantity: number;
  destinationCity: string;
  destinationCountry: string;
  status: SourcingRequestStatus;
  /** The customer account that sent it from the public site, if any. */
  customerUserId?: string | null;
  /** The listing chosen in product discovery (at most one). */
  candidates?: SourcingCandidate[];
  _count?: { candidates: number; attachments: number };
  selectedProductId: string | null;
  selectedProduct: {
    id: string;
    title: string;
    imageUrl: string | null;
    price: string | null;
    currency: string | null;
    canonicalUrl: string;
    externalId: string;
    providerId: string;
  } | null;
  reservationId: string | null;
  reservation: { id: string; status: string } | null;
  orderId: string | null;
  order: { id: string; reference: string; status: OrderStatus } | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ResolveResult {
  providerId: string | null;
  providerSlug: string | null;
  product: {
    title?: string;
    imageUrl?: string;
    price?: number;
    currency?: string;
  };
}

export interface SearchResultItem {
  externalId?: string;
  url: string;
  title?: string;
  imageUrl?: string;
  price?: number;
  currency?: string;
  // Only set for catalog-backed results (sourcing-request matches) — see
  // GET /sourcing-requests/:id/matches.
  productId?: string;
}

export interface SearchFacetOption {
  value: string;
  label: string;
}

export interface SearchFacets {
  categories: SearchFacetOption[];
  brands: SearchFacetOption[];
  priceRange: { min: number; max: number } | null;
}

export interface SearchPagination {
  page: number;
  totalResults: number | null;
  hasMore: boolean;
}

export interface ProductSearchResponse {
  supported: boolean;
  results: SearchResultItem[];
  facets: SearchFacets;
  pagination: SearchPagination;
}

export interface SearchFilters {
  category?: string;
  brand?: string;
  priceMin?: number;
  priceMax?: number;
  page?: number;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface GeoDetectResult {
  location: { country: string; city: string; lat: number; lng: number } | null;
  nearestHubId: string | null;
}

export interface PublicQuote {
  reference: string;
  productName: string;
  productImageUrl: string | null;
  quantity: number;
  route: string;
  status: OrderStatus;
  customerQuoteTotal: number | null;
  currency: string;
  paymentStatus: "UNPAID" | "PAID";
  /** Set once the customer accepts; the status stays QUOTE_SENT until payment. */
  quoteAcceptedAt: string | null;
  intakeType: IntakeType;
  /** The store the goods come from, when TraceCart buys them. */
  sourceName: string | null;
  hubCity: string;
  destinationCity: string;
  destinationCountry: string;
  updatedAt: string;
  /** When the order reached each status (no names, no internal notes). */
  history: { fromStatus: OrderStatus | null; toStatus: OrderStatus; createdAt: string }[];
  /** Where the carrier reported the parcel, newest first. */
  positions: { id: string; city: string; recordedAt: string }[];
  /** The latest quote version, as the customer sees it; null for orders quoted before versions. */
  quote: {
    version: number;
    status: CustomerQuote["status"];
    total: number;
    currency: string;
    /** The delivered price as one line; customs pass-through costs apart. */
    lines: { component: "SERVICE" | "CUSTOMS_DUTIES" | "CUSTOMS_BROKER"; amount: number; basis: QuoteLine["basis"] }[];
    notes: QuoteNote[];
    provisional: boolean;
    validUntil: string;
  } | null;
  /** Milestones that concern the customer, newest first. */
  events: { id: string; milestone: Milestone; occurredAt: string; city: string | null; customerNote: string | null; reason: string | null }[];
  /** An estimate. */
  eta: { from: string | null; to: string | null } | null;
  /** The latest confirmed news (status, milestone or position). */
  lastUpdateAt: string | null;
  /** Proof-of-delivery photos, once delivered. */
  proofOfDelivery: { id: string }[];
}

// ---- Product discovery (apps/api/src/modules/discovery)

export type SpecSource = "observed" | "stated" | "inferred";
export type SpecConfidence = "high" | "medium" | "low";
export interface SpecField {
  value: string | null;
  source: SpecSource | null;
  confidence: SpecConfidence | null;
}
export interface DiscoverySpec {
  title: string | null;
  category: string | null;
  productType: string | null;
  intendedUse: string | null;
  brand: SpecField;
  manufacturer: SpecField;
  model: SpecField;
  partNumbers: string[];
  attributes: { name: string; value: string; unit: string | null; source: SpecSource; confidence: SpecConfidence }[];
  includedItems: string[];
  requiredAccessories: string[];
  shippingFlags: { issue: string; reason: string }[];
  hazardous: "yes" | "no" | "unknown";
  identification: "exact_model" | "product_family" | "product_type" | "unclear";
  uncertainties: string[];
  missingInformation: string[];
  searchQueries: string[];
}

export type CandidateStatus = "PROPOSED" | "SELECTED" | "REJECTED";
export interface SourcingCandidate {
  id: string;
  provider: string;
  url: string;
  title: string;
  merchant: string | null;
  imageUrl: string | null;
  price: string | null;
  currency: string | null;
  availability: string | null;
  brand: string | null;
  model: string | null;
  partNumber: string | null;
  evidence: Record<string, unknown> | null;
  retrievedAt: string;
  score: number;
  scoreReasons: { key: string; points: number; detail?: string }[] | null;
  status: CandidateStatus;
  productId: string | null;
  note: string | null;
}

export interface ProviderOutcome {
  id: string;
  label: string;
  status: "ok" | "unavailable" | "failed" | "timeout" | "disabled";
  results?: number;
  ms?: number;
  detail?: string;
}

export interface DiscoveryState {
  request: SourcingRequest;
  ai: { configured: boolean };
  spec: DiscoverySpec | null;
  extraction: { status: "NONE" | "DONE" | "FAILED"; error: string | null; at: string | null; model: string | null; editedAt: string | null };
  attachments: { id: string; kind: "IMAGE" | "DOCUMENT"; originalName: string | null; mimeType: string; sizeBytes: number; url: string }[];
  providers: ProviderOutcome[];
  candidates: SourcingCandidate[];
  lastRun: { id: string; query: string; providers: ProviderOutcome[]; startedAt: string; finishedAt: string | null } | null;
}
