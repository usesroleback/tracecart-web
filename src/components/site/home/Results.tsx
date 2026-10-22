import { useLocale, useTranslations } from "next-intl";
import { RESULTS, formatFigure } from "./content";
import { Eyebrow, ImageSlot, PillLink, Placeholder } from "./primitives";
import { Reveal } from "./motion";

export function Results() {
  const t = useTranslations("home.results");
  const locale = useLocale();
  const maxBar = Math.max(...RESULTS.borderBars);

  return (
    <section id="results" aria-labelledby="hp-results" className="px-4 py-20 sm:py-28">
      <div className="mx-auto max-w-[640px] text-center">
        <Eyebrow>{t("eyebrow")}</Eyebrow>
        <h2 id="hp-results" className="hp-h2 mt-6">
          {t("title")}
        </h2>
        <p className="mx-auto mt-4 max-w-md text-[var(--hp-text-muted)]">{t("subtitle")}</p>
      </div>

      <Reveal className="mx-auto mt-12 grid max-w-[560px] gap-3 sm:grid-cols-2">
        <article className="flex aspect-square flex-col justify-between rounded-[var(--hp-radius-card)] bg-[var(--hp-tertiary)] p-6 text-[var(--hp-on-tertiary)]">
          <span className="w-fit rounded-[var(--hp-radius-chip)] bg-[#0d0f0e] px-3 py-1 text-xs font-medium text-white">{t("onTimeChip")}</span>
          <div>
            <Placeholder className="hp-numeral block text-6xl">{formatFigure(RESULTS.onTime, locale)}</Placeholder>
            <p className="mt-2 text-sm leading-snug">{t("onTimeCaption")}</p>
          </div>
        </article>

        <article className="flex aspect-square flex-col rounded-[var(--hp-radius-card)] bg-[var(--hp-light-sunken)] p-6">
          <div className="flex items-start justify-between gap-2">
            <span className="text-sm font-medium">{t("borderLabel")}</span>
            <span className="rounded-[var(--hp-radius-chip)] bg-[var(--hp-light-raised)] px-3 py-1 text-xs font-medium">{t("borderChip")}</span>
          </div>
          <Placeholder className="hp-numeral my-auto block text-center text-6xl">{formatFigure(RESULTS.borderWait, locale)}</Placeholder>
          <div aria-hidden className="flex h-10 items-end gap-1" data-placeholder="figure">
            {RESULTS.borderBars.map((v, i) => (
              <span
                key={i}
                className={`flex-1 rounded-[var(--hp-radius-chip)] ${RESULTS.borderBarsHighlighted.includes(i) ? "bg-[var(--hp-secondary-ink)]" : "bg-[var(--color-line-strong)]/40"}`}
                style={{ height: `${(v / maxBar) * 100}%` }}
              />
            ))}
          </div>
          <p className="mt-3 text-sm leading-snug text-[var(--hp-text-muted)]">{t("borderCaption")}</p>
        </article>

        <article className="flex flex-col gap-6 rounded-[var(--hp-radius-card)] bg-[var(--hp-dark)] p-3 text-[var(--hp-on-dark)] sm:col-span-2 sm:flex-row sm:items-stretch">
          <ImageSlot name="result-customer" ratio="3/4" alt={t("savingImageAlt")} tone="dark" className="w-full rounded-[var(--hp-corner-media)] max-sm:aspect-[16/10] sm:w-44">
            <div className="absolute inset-x-5 bottom-5">
              <ImageSlot name="result-customer-logo" ratio="4/1" alt={t("savingLogoAlt")} className="rounded-[var(--hp-radius-chip)] bg-white/80 [&>span]:text-[9px]" />
            </div>
          </ImageSlot>
          <div className="flex flex-1 flex-col justify-between gap-6 p-4 sm:py-6 sm:pr-6">
            <p className="text-[15px] text-[var(--hp-on-dark-muted)]">{t("savingLabel")}</p>
            <Placeholder className="hp-numeral block text-7xl text-[var(--hp-primary)]">{formatFigure(RESULTS.saving, locale)}</Placeholder>
            {/* TODO: link the case study once it exists. */}
            <PillLink href="#work" tone="light" className="w-fit">
              {t("savingCta")}
            </PillLink>
          </div>
        </article>
      </Reveal>
    </section>
  );
}
