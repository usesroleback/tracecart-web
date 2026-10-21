"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { TESTIMONIALS } from "./content";
import { Eyebrow, ImageSlot, Placeholder } from "./primitives";
import { prefersReducedMotion } from "./motion";

const ROTATE_MS = 7000;

function Star() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className="size-5 text-[var(--hp-tertiary)]" fill="currentColor">
      <path d="m10 1.8 2.5 5.3 5.8.7-4.3 4 1.1 5.7L10 14.7l-5.1 2.8L6 11.8l-4.3-4 5.8-.7z" />
    </svg>
  );
}

export function Testimonials() {
  const t = useTranslations("home.testimonials");
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || prefersReducedMotion()) return;
    const id = window.setInterval(() => setActive((a) => (a + 1) % TESTIMONIALS.length), ROTATE_MS);
    return () => window.clearInterval(id);
  }, [paused]);

  const key = TESTIMONIALS[active];

  return (
    <section aria-labelledby="hp-testimonials" className="mx-auto max-w-[1000px] px-6 py-20 sm:py-28">
      <div className="text-center">
        <Eyebrow>{t("eyebrow")}</Eyebrow>
        <h2 id="hp-testimonials" className="hp-h2 mt-6">
          {t("title")}
        </h2>
      </div>

      <div
        className="mt-12 flex flex-col-reverse gap-4 md:flex-row md:items-stretch"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
      >
        <ul className="flex justify-center gap-3 md:flex-col md:justify-center md:[mask-image:linear-gradient(transparent,#000_8%,#000_92%,transparent)] md:py-4">
          {TESTIMONIALS.map((k, i) => {
            const name = t(`items.${k}.name`);
            const on = i === active;
            return (
              <li key={k} className="flex justify-center">
                <button
                  type="button"
                  onClick={() => setActive(i)}
                  aria-label={t("pick", { name })}
                  aria-pressed={on}
                  className={`overflow-hidden rounded-2xl transition-all ${on ? "size-20 ring-[3px] ring-[var(--hp-primary)] ring-offset-2 ring-offset-[var(--hp-light)]" : "size-14 opacity-50 hover:opacity-80"}`}
                >
                  <ImageSlot name={`testimonial-${k}`} alt="" className="size-full [&>span]:text-[8px]" />
                </button>
              </li>
            );
          })}
        </ul>

        <figure aria-live={paused ? "polite" : "off"} className="relative flex min-h-[300px] flex-1 flex-col rounded-[var(--hp-radius-card)] bg-[var(--hp-light-sunken)] p-6 sm:p-10">
          <div role="img" aria-label={t("stars")} className="flex gap-1">
            {[0, 1, 2, 3, 4].map((n) => (
              <Star key={n} />
            ))}
          </div>
          <blockquote className="mt-6 text-xl leading-snug tracking-tight sm:text-2xl">
            <Placeholder>{t(`items.${key}.quote`)}</Placeholder>
          </blockquote>
          <figcaption className="mt-auto flex items-end justify-between gap-4 pt-8">
            <div className="text-sm">
              <p>
                <Placeholder className="font-semibold">{t(`items.${key}.name`)}</Placeholder>
                <span className="text-[var(--hp-text-muted)]"> · {t(`items.${key}.role`)}</span>
              </p>
              <p className="text-[var(--hp-text-muted)]">{t(`items.${key}.company`)}</p>
            </div>
            <ImageSlot name={`testimonial-${key}-logo`} ratio="3/1" alt={t("logoAlt")} className="w-24 shrink-0 rounded-lg [&>span]:text-[8px]" />
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
