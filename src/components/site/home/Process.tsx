"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { PROCESS } from "./content";
import { ImageSlot } from "./primitives";
import { CountUp, prefersReducedMotion } from "./motion";

const STEPS = ["tell", "price", "follow"] as const;
const ROTATE_MS = 4000;

export function Process() {
  const t = useTranslations("home.process");
  const [step, setStep] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = useRef<number | null>(null);

  // Rotates every few seconds, unless the visitor is interacting or prefers no motion.
  useEffect(() => {
    if (paused || prefersReducedMotion()) return;
    const id = window.setInterval(() => setStep((s) => (s + 1) % STEPS.length), ROTATE_MS);
    return () => window.clearInterval(id);
  }, [paused]);

  const go = (n: number) => setStep((n + STEPS.length) % STEPS.length);
  const key = STEPS[step];

  return (
    <section id="process" aria-labelledby="hp-process" className="mx-[var(--hp-gutter)] grid gap-3 pb-20 sm:pb-28 lg:grid-cols-[2fr_3fr]">
      <div className="flex flex-col justify-between gap-10 rounded-[var(--hp-radius-card)] bg-[var(--hp-light-sunken)] p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <h2 id="hp-process" className="hp-h2 max-w-[10ch]">
            {t("title")}
          </h2>
          <p className="max-w-[24ch] text-right text-sm text-[var(--hp-text-muted)]">{t("subtitle")}</p>
        </div>
        <div className="flex items-end gap-5">
          <ImageSlot name="process-team" ratio="4/5" alt={t("imageAlt")} className="w-36 shrink-0 rounded-[var(--hp-radius-card)] sm:w-44" />
          <div className="pb-1">
            <CountUp figure={PROCESS.years} className="hp-numeral text-7xl" />
            <p className="mt-3 max-w-[22ch] text-sm leading-snug text-[var(--hp-text-muted)]">{t("yearsCaption")}</p>
          </div>
        </div>
      </div>

      <div
        className="flex flex-col items-center justify-center gap-6 rounded-[var(--hp-corner-panel)] bg-[var(--hp-dark)] px-6 py-12 text-[var(--hp-on-dark)] sm:px-16 sm:py-16"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
        onTouchStart={(e) => {
          touchX.current = e.touches[0].clientX;
          setPaused(true);
        }}
        onTouchEnd={(e) => {
          const start = touchX.current;
          touchX.current = null;
          if (start === null) return;
          const dx = e.changedTouches[0].clientX - start;
          if (Math.abs(dx) > 40) go(step + (dx < 0 ? 1 : -1));
        }}
      >
        <p className="text-sm text-[var(--hp-on-dark-muted)]">{t("stepsLabel")}</p>

        <div className="flex w-full max-w-md items-center gap-3">
          <button type="button" onClick={() => go(step - 1)} aria-label={t("previous")} className="hidden size-10 shrink-0 place-items-center rounded-[var(--hp-radius-control)] border border-white/20 hover:bg-white/10 sm:grid">
            <svg viewBox="0 0 16 16" aria-hidden className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 3 5 8l5 5" />
            </svg>
          </button>
          <article aria-live={paused ? "polite" : "off"} className="min-h-[220px] flex-1 rounded-[var(--hp-radius-card)] bg-[var(--hp-secondary)] p-6 text-[var(--hp-text)]">
            <span className="rb-mono grid size-10 place-items-center rounded-[var(--hp-radius-chip)] bg-white font-semibold text-[#0d0f0e]">{String(step + 1).padStart(2, "0")}</span>
            <h3 className="mt-6 text-2xl font-semibold tracking-tight">{t(`steps.${key}.title`)}</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-[var(--hp-text-muted)]">{t(`steps.${key}.body`)}</p>
          </article>
          <button type="button" onClick={() => go(step + 1)} aria-label={t("next")} className="hidden size-10 shrink-0 place-items-center rounded-[var(--hp-radius-control)] border border-white/20 hover:bg-white/10 sm:grid">
            <svg viewBox="0 0 16 16" aria-hidden className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="m6 3 5 5-5 5" />
            </svg>
          </button>
        </div>

        <div className="flex w-full max-w-[220px] gap-2">
          {STEPS.map((s, i) => (
            <button
              key={s}
              type="button"
              onClick={() => go(i)}
              aria-label={t("goTo", { n: i + 1 })}
              aria-current={i === step ? "step" : undefined}
              className="flex h-6 flex-1 items-center"
            >
              <span className={`h-1 w-full rounded-[var(--hp-radius-chip)] transition-colors ${i === step ? "bg-[var(--hp-primary)]" : "bg-white/20"}`} />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
