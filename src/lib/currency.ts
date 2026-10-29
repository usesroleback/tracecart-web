// Amounts travel in minor units with a currency code (the API's rule); people
// read and type major units. Safe in the browser and on the server.

/** Digits after the decimal point in a currency: XOF 0, EUR 2. */
export function currencyExponent(currency: string): number {
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions().maximumFractionDigits ?? 2;
  } catch {
    return 2;
  }
}

/** Minor units to the amount people read: 45000 XOF → 45000; 1999 EUR → 19.99. */
export const toMajor = (amountMinor: number, currency: string) => amountMinor / 10 ** currencyExponent(currency);

/** What someone typed ("19.99") to minor units, or null when it isn't an amount. */
export function toMinor(typed: string, currency: string): number | null {
  const n = Number(typed.trim().replace(",", "."));
  if (typed.trim() === "" || !Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 10 ** currencyExponent(currency));
}
