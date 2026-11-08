import { getFormatter, getTranslations } from "next-intl/server";

/** Stars from approved reviews, with their number; read out as a sentence. */
export async function Rating({ average, count }: { average: number; count: number }) {
  const t = await getTranslations("store.card");
  const format = await getFormatter();
  const value = format.number(average, { maximumFractionDigits: 1 });
  const full = Math.round(average);
  return (
    <p className="flex items-center gap-1.5 text-xs text-ink-muted">
      <span aria-hidden className="tracking-[0.1em] text-ink">
        {"★".repeat(full)}
        <span className="text-line-strong">{"★".repeat(5 - full)}</span>
      </span>
      <span aria-hidden>
        {value} ({format.number(count)})
      </span>
      <span className="sr-only">{t("rating", { value, count })}</span>
    </p>
  );
}
