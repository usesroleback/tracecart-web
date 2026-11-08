// The cookie holding the currency a shopper reads approximate prices in (ADR-077).
// Shared by the server (lib/displayCurrency) and the header's picker.
export const CURRENCY_COOKIE = "tc_currency";

export function rememberCurrency(code: string) {
  document.cookie = `${CURRENCY_COOKIE}=${encodeURIComponent(code)}; path=/; max-age=${365 * 24 * 3600}; samesite=lax`;
}
