import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { currencyExponent, toMajor } from "@/lib/store";
import { displayCurrency } from "@/lib/displayCurrency";

/**
 * "45 000 XOF", in the page's grouping, with the earlier price struck through
 * when there is one. When the shopper reads prices in another currency, an
 * approximation follows ("≈ 68.60 EUR"), from a rate staff keep: the order is
 * charged in the real currency (ADR-077).
 */
export async function Price({
  amountMinor,
  currency,
  compareAtMinor,
  size = "m",
  wasLabel,
}: {
  amountMinor: number;
  currency: string;
  compareAtMinor?: number | null;
  size?: "s" | "m" | "l";
  /** "Was {price}", for screen readers. */
  wasLabel?: (price: string) => string;
}) {
  const format = await getFormatter();
  const locale = await getLocale();
  const approx = await displayCurrency(locale);
  const show = (minor: number) => `${format.number(toMajor(minor, currency))} ${currency}`;
  const big = size === "l" ? "text-[28px] sm:text-[32px]" : size === "m" ? "text-lg" : "text-base";

  let approximate: { text: string; title: string } | null = null;
  if (approx && approx.code !== currency) {
    const t = await getTranslations("store.price");
    const digits = currencyExponent(approx.code);
    const amount = format.number(toMajor(amountMinor, currency) * approx.rate, { minimumFractionDigits: digits, maximumFractionDigits: digits });
    approximate = {
      text: `≈ ${amount} ${approx.code}`,
      title: t("approxTitle", { currency, date: format.dateTime(new Date(approx.updatedAt), { dateStyle: "medium" }) }),
    };
  }

  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-2">
      <span className={`rb-numeral font-semibold tracking-tight text-ink ${big}`}>{show(amountMinor)}</span>
      {compareAtMinor && compareAtMinor > amountMinor ? (
        <s className="text-sm text-ink-muted">
          {wasLabel ? <span className="sr-only">{wasLabel(show(compareAtMinor))}</span> : null}
          <span aria-hidden={wasLabel ? true : undefined}>{show(compareAtMinor)}</span>
        </s>
      ) : null}
      {approximate ? (
        <span className="text-xs text-ink-muted" title={approximate.title}>
          {approximate.text}
          <span className="sr-only"> ({approximate.title})</span>
        </span>
      ) : null}
    </span>
  );
}
