"use client";

import { useTranslations } from "next-intl";
import { useFormat } from "@/lib/format";

// The delivered price the finder shows with each suggestion (POST /customer/suggest).

/** A result's price delivered to the customer's country, as the API gives it (never the store's). */
export type ShopPrice =
  | { priced: true; currency: string; total: number; service: number; customsDuties: number | null; customsBroker: number | null; customsIncluded: boolean; etaFrom: string | null; etaTo: string | null }
  | { priced: false; reason: "noPrice" | "noWeight" | "noRoute" };

/** One price, everything to the customer's door, and when it would arrive; "on request" otherwise. */
export function PriceBlock({ price, compact = false }: { price: ShopPrice | null; compact?: boolean }) {
  const t = useTranslations("shop");
  const f = useFormat();
  if (!price || !price.priced) return <p className="text-sm font-semibold text-ink-muted">{t("onRequest")}</p>;
  return (
    <div>
      <p className={`${compact ? "text-base" : "text-xl"} font-semibold tabular-nums`}>{f.money(price.total, price.currency)}</p>
      <p className="text-xs text-ink-muted">{t("allIn")}</p>
      {!compact && price.etaFrom && price.etaTo && <p className="mt-1 text-xs text-ink-muted">{t("eta", { from: f.shortDate(price.etaFrom), to: f.shortDate(price.etaTo) })}</p>}
    </div>
  );
}
