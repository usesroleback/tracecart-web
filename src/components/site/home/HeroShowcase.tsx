"use client";

import { useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";

// What people come to Tracecart for, one card at a time over the hero photo.
const ITEMS = ["tool", "equipment", "part", "move"] as const;
const SLIDE_MS = 5000;

// prefers-reduced-motion, kept current; false on the server.
const REDUCE = "(prefers-reduced-motion: reduce)";
const subscribe = (onChange: () => void) => {
  const mq = window.matchMedia(REDUCE);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
};
const useReducedMotion = () =>
  useSyncExternalStore(subscribe, () => window.matchMedia(REDUCE).matches, () => false);

/**
 * Cards that sweep from one to the next over the hero photo (bottom right),
 * on a gradient that keeps the white text readable. Each card's bar fills
 * while it shows; the next one comes when the bar is full. Hovering, focus
 * or the pause button stops it; with reduced motion it doesn't move by itself.
 */
export function HeroShowcase() {
  const t = useTranslations("home.hero.showcase");
  const [active, setActive] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [paused, setPaused] = useState(false);
  const still = useReducedMotion();

  const stopped = paused || hovered || still;
  const next = () => setActive((i) => (i + 1) % ITEMS.length);

  return (
    <>
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent sm:bg-gradient-to-tl sm:from-black/75 sm:via-black/20 sm:via-40%" />

      <section
        aria-roledescription="carousel"
        aria-label={t("label")}
        className="absolute inset-x-3 bottom-3 text-left text-white sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[380px] lg:bottom-8 lg:right-8"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setHovered(true)}
        onBlur={() => setHovered(false)}
      >
        <div className="rounded-[var(--hp-radius-card)] border border-white/15 bg-black/35 p-4 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.6)] backdrop-blur-md sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-white/70">{t("label")}</p>
            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              aria-label={paused ? t("play") : t("pause")}
              className="grid size-7 place-items-center rounded-[var(--hp-radius-chip)] text-white/80 hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-white"
            >
              <svg viewBox="0 0 16 16" aria-hidden className="size-3.5" fill="currentColor">
                {paused ? <path d="M4.5 3v10l8-5z" /> : <path d="M4 3h3v10H4zM9 3h3v10H9z" />}
              </svg>
            </button>
          </div>

          <div className="mt-3 overflow-hidden" aria-live={stopped ? "polite" : "off"}>
            <ul
              className="flex transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
              style={{ transform: `translateX(-${active * 100}%)` }}
            >
              {ITEMS.map((key, i) => (
                <li
                  key={key}
                  aria-roledescription="slide"
                  aria-label={t("position", { n: i + 1, total: ITEMS.length })}
                  aria-hidden={i !== active}
                  className={`w-full shrink-0 transition-opacity duration-700 ${i === active ? "opacity-100" : "opacity-0"}`}
                >
                  <h3 className="text-lg font-semibold sm:text-xl leading-snug tracking-tight">{t(`items.${key}.title`)}</h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-white/80 sm:text-sm">{t(`items.${key}.body`)}</p>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-4 flex gap-1.5 sm:mt-5">
            {ITEMS.map((key, i) => (
              <button
                key={key}
                type="button"
                onClick={() => setActive(i)}
                aria-label={t("goTo", { title: t(`items.${key}.title`) })}
                aria-current={i === active ? "true" : undefined}
                className="flex h-5 flex-1 items-center"
              >
                <span className="relative h-[3px] w-full overflow-hidden rounded-full bg-white/25">
                  {i < active && <span className="absolute inset-0 bg-white" />}
                  {i === active && (
                    <span
                      // Remounted for each card, so the fill restarts; the next card comes when it's full.
                      key={`fill-${active}`}
                      className="hp-showcase-fill absolute inset-0 origin-left bg-white"
                      style={{ animationDuration: `${SLIDE_MS}ms`, animationPlayState: stopped ? "paused" : "running" }}
                      onAnimationEnd={next}
                    />
                  )}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
