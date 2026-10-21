"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { HERO, formatFigure } from "./content";
import { CountUp, prefersReducedMotion, useInView } from "./motion";

const TOTAL_DOTS = 21;

export function HeroMetricCard() {
  const t = useTranslations("home.hero");
  const locale = useLocale();
  const [ref, inView] = useInView<HTMLDivElement>(0.3);
  const [lit, setLit] = useState(HERO.dotsOn);

  // The dots fill one by one, on a timer (the final state is what renders first).
  useEffect(() => {
    if (!inView || prefersReducedMotion()) return;
    let n = 0;
    const id = window.setInterval(() => {
      setLit(n);
      n += 1;
      if (n > HERO.dotsOn) window.clearInterval(id);
    }, 70);
    return () => window.clearInterval(id);
  }, [inView]);

  const maxBar = Math.max(...HERO.bars);

  return (
    <div ref={ref} className="flex flex-col rounded-[var(--hp-radius-card)] bg-[var(--hp-dark-deep)] p-6 text-[var(--hp-on-dark)]">
      <div role="img" aria-label={t("cardDotsLabel", { on: HERO.dotsOn, total: TOTAL_DOTS })} className="grid w-fit grid-cols-7 gap-2" data-placeholder="figure">
        {Array.from({ length: TOTAL_DOTS }, (_, i) => (
          <span key={i} className={`hp-dot size-4 rounded-full ${i < lit ? "is-on" : ""}`} />
        ))}
      </div>

      <div className="mt-6 flex items-end justify-between gap-3">
        <CountUp figure={HERO.onTime} className="hp-numeral text-6xl" />
        <span className="pb-1 text-right text-sm text-[var(--hp-on-dark-muted)]">{t("cardLabel")}</span>
      </div>
      <hr className="my-5 border-white/10" />
      <p className="text-[15px] leading-snug text-[var(--hp-on-dark)]">{t("cardBody")}</p>
      <div className="mt-4 flex items-baseline justify-between gap-3 text-sm">
        <span className="text-[var(--hp-on-dark-muted)]">{t("cardRowLabel")}</span>
        <span data-placeholder="figure" className="rb-mono font-semibold text-[var(--hp-secondary-on-dark)]">
          {formatFigure(HERO.borderWait, locale)}
        </span>
      </div>

      <div role="img" aria-label={t("cardChartLabel")} className="mt-auto flex h-20 items-end gap-1.5 border-t-[24px] border-transparent" data-placeholder="figure">
        {HERO.bars.map((v, i) => (
          <span
            key={i}
            className={`flex-1 rounded-sm ${HERO.barsHighlighted.includes(i) ? "bg-[var(--hp-secondary-on-dark)]" : "bg-white/15"}`}
            style={{ height: `${(v / maxBar) * 100}%` }}
          />
        ))}
      </div>
    </div>
  );
}
