import type { CustomerShipment } from "@/components/shipments/Shipments";
// What the checkout and order routes return (they document no response shapes yet).

export type Breakdown = {
  itemMinor: number;
  shippingMinor: number;
  dutiesMinor: number;
  taxesMinor: number;
  feesMinor: number;
  discountMinor?: number;
  totalMinor: number;
};

export type PaymentMethod = "CINETPAY" | "CASH_ON_DELIVERY" | "BANK_TRANSFER" | "FAKE" | "NET_30" | "GIFT_CARD";

export interface Address {
  id: string;
  label: string | null;
  recipientName: string;
  phone: string;
  countryCode: string;
  city: string;
  district: string | null;
  street: string | null;
  landmark: string;
  isDefault: boolean;
}

export interface PickupPoint {
  id: string;
  name: string;
  countryCode: string;
  city: string;
  addressLine: string;
  landmark: string | null;
  phone: string | null;
  openingHours: Record<string, string> | null;
}

export interface Quote {
  currency: string;
  available: boolean;
  problems: { code: string; lineId?: string; shipment?: string; params?: Record<string, string> }[];
  lines: {
    id: string;
    sku: string;
    title: string;
    quantity: number;
    unitPriceMinor: number;
    fulfillmentType: string;
    breakdown: Breakdown | null;
    promise: { from: string; to: string } | null;
    shipment: string | null;
  }[];
  shipments: { key: string; from: { city: string; countryCode: string }; crossBorder: boolean; lineIds: string[]; shippingMinor: number }[];
  totals: Breakdown;
  promise: { from: string; to: string } | null;
  /** Offered where a border is crossed (ADR-090). */
  speed: "STANDARD" | "EXPRESS";
  speedOptions: { speed: "STANDARD" | "EXPRESS"; available: boolean; shippingMinor: number; totalMinor: number; promise: { from: string; to: string } | null }[];
  paymentMethods: { method: PaymentMethod; available: boolean; blockers: string[]; instructions: string | null }[];
  coupon: { code: string; discountMinor: number; error: string | null } | null;
  /** A gift card pays part or all of the total (ADR-071); amountDueMinor is the rest. */
  giftCard: { last4: string | null; balanceMinor: number; appliedMinor: number; error: string | null } | null;
  amountDueMinor: number;
}

export interface PaymentView {
  id: string;
  method: PaymentMethod;
  status: string;
  amountMinor: number;
  currency: string;
  checkoutUrl: string | null;
  expiresAt: string | null;
  failureReason: string | null;
  instructions: string | null;
}

export interface OrderView {
  id: string;
  reference: string;
  /** PRODUCTS from checkout; SOURCING and FREIGHT from an accepted quote. */
  kind: "PRODUCTS" | "SOURCING" | "FREIGHT";
  status: string;
  createdAt: string;
  placedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  currency: string;
  totals: Breakdown;
  couponCode?: string | null;
  discountMinor?: number;
  deliveryMethod: "HOME" | "PICKUP";
  delivery: {
    recipientName?: string;
    /** Freight orders: the request's contact and address. */
    contactName?: string;
    addressLine?: string;
    phone?: string;
    city?: string;
    district?: string | null;
    street?: string | null;
    landmark?: string;
    countryCode?: string;
    pickupPoint?: { name: string; addressLine: string; city: string; countryCode: string; landmark: string | null };
  };
  paymentMethod: PaymentMethod;
  promise: { from: string; to: string };
  lines: { id: string; sku: string; title: string; quantity: number; unitPriceMinor: number; breakdown: Breakdown; status: string; fulfillmentType: string | null; promise: { from: string; to: string } }[];
  payments: PaymentView[];
  invoice: { number: string; issuedAt: string } | null;
  canCancel: boolean;
  canPay: boolean;
  timeline: { status: string; at: string }[];
  /** Only on the customer's own order. */
  shipments?: CustomerShipment[];
  refunds?: { id: string; amountMinor: number; currency: string; paid: boolean; paidAt: string | null; creditNoteNumber: string | null }[];
  returnOptions?: { orderLineId: string; quantity: number; returnUntil: string | null; warrantyUntil: string | null; canReturn: boolean; canClaimWarranty: boolean }[];
}
