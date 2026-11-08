import { cookies } from "next/headers";
import { CURRENCY_COOKIE } from "./currencyChoice";
import { STORE_CURRENCY, storeApi } from "./store";

// The currency a shopper chose to read prices in (ADR-077): shown only as an
// approximation beside the real price, from a rate staff keep. Checkout,
// invoices and payments stay in the store's currency.

export interface DisplayCurrency {
  code: string;
  /** Units of `code` for one unit of the store's currency. */
  rate: number;
  source: string | null;
  updatedAt: string;
}

export interface CurrencyOptions {
  base: string;
  rates: { currency: string; rate: string; source: string | null; updatedAt: string }[];
}

/** The currencies on offer: the store's own and those with a kept rate. */
export async function currencyOptions(locale: string): Promise<CurrencyOptions> {
  const { data } = await storeApi(locale)
    .GET("/catalog/currencies", { params: { query: { currency: STORE_CURRENCY } } })
    .catch(() => ({ data: undefined }));
  return data ?? { base: STORE_CURRENCY, rates: [] };
}

/** The shopper's chosen currency, when it isn't the store's and a rate exists for it. */
export async function displayCurrency(locale: string): Promise<DisplayCurrency | null> {
  const chosen = (await cookies()).get(CURRENCY_COOKIE)?.value;
  if (!chosen || chosen === STORE_CURRENCY) return null;
  const found = (await currencyOptions(locale)).rates.find((r) => r.currency === chosen);
  const rate = found ? Number(found.rate) : NaN;
  return found && Number.isFinite(rate) && rate > 0 ? { code: found.currency, rate, source: found.source, updatedAt: found.updatedAt } : null;
}
