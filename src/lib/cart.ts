"use client";

import type { components } from "./api/schema";

// The cart from the browser. Signed in, it's the account's (/me/cart); signed
// out, a guest cart kept by a token in a cookie (/carts/{token}). Signing in
// merges the guest cart into the account's (mergeGuestCart). Every change
// announces the new item count, for the header's cart link.

export type CartLine = {
  id: string;
  sku: string;
  productSlug: string;
  title: string;
  brand: { slug: string; name: string } | null;
  image: { url: string; alt: string } | null;
  options: Record<string, string>;
  offerId: string;
  seller: { name: string } | null;
  fulfillmentType: string;
  quantity: number;
  savedForLater: boolean;
  unitPrice: { amountMinor: number; currency: string };
  addedPriceMinor: number;
  lineTotalMinor: number;
  availability: components["schemas"]["Availability"];
  availableQuantity: number | null;
  issues: ("UNAVAILABLE" | "OUT_OF_STOCK" | "NOT_ENOUGH_STOCK" | "PRICE_CHANGED")[];
};

export type Cart = {
  id: string;
  token: string | null;
  currency: string;
  lines: CartLine[];
  itemCount: number;
  subtotalMinor: number;
  ready: boolean;
};

const COOKIE = "tc_cart";
export const CART_EVENT = "tc:cart";

function guestToken(): string | null {
  return document.cookie.match(new RegExp(`(?:^|; )${COOKIE}=([A-Za-z0-9_-]+)`))?.[1] ?? null;
}
function rememberToken(token: string | null) {
  document.cookie = token ? `${COOKIE}=${token}; path=/; max-age=${60 * 60 * 24 * 60}; samesite=lax` : `${COOKIE}=; path=/; max-age=0; samesite=lax`;
}

function country(): string {
  const c = document.cookie.match(/(?:^|; )tc_country=([A-Z]{2})/)?.[1];
  return c ? `?country=${c}` : "";
}

async function request(method: string, path: string, body?: unknown): Promise<{ status: number; data: unknown }> {
  const res = await fetch(`/api/tracecart${path}`, {
    method,
    headers: { ...(body !== undefined ? { "Content-Type": "application/json" } : {}), "X-Tracecart-Locale": document.documentElement.lang || "fr" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const text = await res.text();
  return { status: res.status, data: text ? JSON.parse(text) : null };
}

export class CartError extends Error {
  constructor(
    message: string,
    readonly code: string | null
  ) {
    super(message);
  }
}

function fail(r: { status: number; data: unknown }): never {
  const e = (r.data as { error?: { message?: string; code?: string } } | null)?.error;
  throw new CartError(e?.message ?? `Request failed (${r.status})`, e?.code ?? null);
}

function announce(cart: Cart | null) {
  window.dispatchEvent(new CustomEvent(CART_EVENT, { detail: cart?.itemCount ?? 0 }));
  return cart;
}

/** Signed out (401), or an account that doesn't buy (403, staff): the guest cart applies. */
const guestish = (status: number) => status === 401 || status === 403;

/** The current cart, or null when there's none yet. */
export async function getCart(): Promise<Cart | null> {
  const mine = await request("GET", `/me/cart${country()}`);
  if (mine.status === 200) return announce(mine.data as Cart);
  if (!guestish(mine.status)) fail(mine);
  const token = guestToken();
  if (!token) return announce(null);
  const guest = await request("GET", `/carts/${token}${country()}`);
  if (guest.status === 404) {
    rememberToken(null);
    return announce(null);
  }
  if (guest.status !== 200) fail(guest);
  return announce(guest.data as Cart);
}

/** Adds to the cart (the buy box's offer unless one is named), starting a guest cart when needed. */
export async function addToCart(sku: string, quantity = 1, offerId?: string): Promise<Cart> {
  const body = { sku, quantity, ...(offerId ? { offerId } : {}) };
  const mine = await request("POST", `/me/cart/lines${country()}`, body);
  if (mine.status === 200) return announce(mine.data as Cart)!;
  if (!guestish(mine.status)) fail(mine);
  let token = guestToken();
  for (let attempt = 0; attempt < 2; attempt++) {
    if (!token) {
      const created = await request("POST", "/carts");
      if (created.status !== 201) fail(created);
      token = (created.data as { token: string }).token;
      rememberToken(token);
    }
    const added = await request("POST", `/carts/${token}/lines${country()}`, body);
    if (added.status === 200) return announce(added.data as Cart)!;
    // The guest cart was merged or has gone: start another.
    if (added.status === 404 && attempt === 0) {
      token = null;
      continue;
    }
    fail(added);
  }
  throw new CartError("Couldn't add to the cart", null);
}

async function lineCall(method: "PATCH" | "DELETE", lineId: string, body?: unknown): Promise<Cart> {
  const mine = await request(method, `/me/cart/lines/${lineId}${country()}`, body);
  if (mine.status === 200) return announce(mine.data as Cart)!;
  if (!guestish(mine.status)) fail(mine);
  const token = guestToken();
  if (!token) throw new CartError("No cart", null);
  const guest = await request(method, `/carts/${token}/lines/${lineId}${country()}`, body);
  if (guest.status !== 200) fail(guest);
  return announce(guest.data as Cart)!;
}

export const updateLine = (lineId: string, patch: { quantity?: number; savedForLater?: boolean }) => lineCall("PATCH", lineId, patch);
export const removeLine = (lineId: string) => lineCall("DELETE", lineId);

/** After signing in: the guest cart's lines move into the account's. */
export async function mergeGuestCart(): Promise<void> {
  const token = guestToken();
  if (!token) return;
  const merged = await request("POST", `/me/cart/merge${country()}`, { token });
  if (merged.status === 200) {
    rememberToken(null);
    announce(merged.data as Cart);
  }
}
