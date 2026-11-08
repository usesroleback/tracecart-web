import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { getLocale } from "next-intl/server";
import "./home.css";
import { ShopHeader } from "../header/ShopHeader";
import { ClosingAndFooter } from "./ClosingAndFooter";
import { STORE_CURRENCY, storeApi, storeCountry } from "@/lib/store";
import { currencyOptions } from "@/lib/displayCurrency";
import { CURRENCY_COOKIE } from "@/lib/currencyChoice";

/**
 * Every public page: the shopping header (departments from the category tree,
 * search, the shopper's settings), the page, and the dark footer panel. The
 * homepage adds the closing call to action above the footer.
 */
export async function SiteShell({ children, closing = false, query }: { children: ReactNode; closing?: boolean; query?: string }) {
  const locale = await getLocale();
  const [tree, currencies] = await Promise.all([
    storeApi(locale)
      .GET("/catalog/categories", { params: { query: { country: await storeCountry(), currency: STORE_CURRENCY } } })
      .then((r) => r.data?.categories ?? [])
      // Without the API the page still renders, with no departments in the header.
      .catch(() => []),
    currencyOptions(locale),
  ]);
  const chosen = (await cookies()).get(CURRENCY_COOKIE)?.value;
  const currency = chosen && (chosen === currencies.base || currencies.rates.some((r) => r.currency === chosen)) ? chosen : currencies.base;
  return (
    <div className="hp min-h-screen pb-[1px]">
      <ShopHeader departments={tree} currencies={currencies} currency={currency} query={query} />
      {children}
      <ClosingAndFooter closing={closing} />
    </div>
  );
}
