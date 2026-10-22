import { useLocale, useTranslations } from "next-intl";
import type { CSSProperties } from "react";
import { CASES, formatFigure } from "./content";
import { ImageSlot, PillLink, Placeholder } from "./primitives";

/** Case studies stack as you scroll: each card sticks and the next slides over it. */
export function SelectedWork() {
  const t = useTranslations("home.work");
  const locale = useLocale();

  return (
    <section id="work" aria-labelledby="hp-work" className="mx-auto max-w-[1200px] px-4 pb-20 sm:px-6 sm:pb-28">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 id="hp-work" className="hp-h2">
          {t("title")}
        </h2>
        {/* TODO: the case-study index doesn't exist yet. */}
        <PillLink href="#">{t("all")}</PillLink>
      </div>

      <ol className="mt-10 space-y-6">
        {CASES.map((c, i) => (
          <li key={c.key} className="hp-stack__card" style={{ "--hp-stack-index": i } as CSSProperties}>
            <article className="hp-stack__inner relative overflow-hidden rounded-[var(--hp-corner-media)] bg-[var(--hp-slot)]">
              <ImageSlot name={`case-${c.key}`} ratio="2/1" alt={t(`items.${c.key}.imageAlt`)} className="min-h-[240px] w-full [&>span]:absolute [&>span]:left-4 [&>span]:top-4" />
              <div className="relative m-3 flex flex-col rounded-[var(--hp-radius-card)] bg-[var(--hp-dark)] p-6 text-[var(--hp-on-dark)] lg:absolute lg:inset-y-0 lg:right-0 lg:w-[38%] lg:min-w-[340px]">
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-[var(--hp-radius-chip)] bg-[var(--hp-dark-raised)] px-3 py-1 text-xs">{t(`items.${c.key}.sector`)}</span>
                  <span className="rounded-[var(--hp-radius-chip)] bg-[var(--hp-dark-raised)] px-3 py-1 text-xs">{t(`items.${c.key}.service`)}</span>
                </div>
                <h3 className="mt-5 text-2xl font-semibold tracking-tight">
                  <Placeholder>{t(`items.${c.key}.client`)}</Placeholder>
                </h3>
                <p className="mt-3 text-[15px] leading-relaxed text-[var(--hp-on-dark-muted)]">{t(`items.${c.key}.summary`)}</p>
                <hr className="my-5 border-white/10 lg:mt-auto" />
                <div className="flex items-end justify-between gap-4">
                  <Placeholder className="hp-numeral text-5xl text-[var(--hp-primary)]">{formatFigure(c.result, locale)}</Placeholder>
                  <span className="max-w-[16ch] text-right text-sm text-[var(--hp-on-dark-muted)]">{t(`items.${c.key}.resultLabel`)}</span>
                </div>
                {/* TODO: link each case study once its page exists. */}
                <PillLink href="#" tone={i % 2 === 0 ? "light" : "secondary"} block className="mt-6">
                  {t("cta")}
                </PillLink>
              </div>
            </article>
          </li>
        ))}
      </ol>
    </section>
  );
}
