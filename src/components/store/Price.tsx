import { getFormatter } from "next-intl/server";
import { toMajor } from "@/lib/store";

/** "45 000 XOF", in the page's grouping, with the earlier price struck through when there is one. */
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
  const show = (minor: number) => `${format.number(toMajor(minor, currency))} ${currency}`;
  const big = size === "l" ? "text-[28px] sm:text-[32px]" : size === "m" ? "text-lg" : "text-base";
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-2">
      <span className={`rb-numeral font-semibold tracking-tight text-ink ${big}`}>{show(amountMinor)}</span>
      {compareAtMinor && compareAtMinor > amountMinor ? (
        <s className="text-sm text-ink-muted">
          {wasLabel ? <span className="sr-only">{wasLabel(show(compareAtMinor))}</span> : null}
          <span aria-hidden={wasLabel ? true : undefined}>{show(compareAtMinor)}</span>
        </s>
      ) : null}
    </span>
  );
}
