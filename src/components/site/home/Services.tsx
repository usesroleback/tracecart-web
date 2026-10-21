"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { useTranslations } from "next-intl";
import { Eyebrow, ImageSlot } from "./primitives";

const SERVICES = ["sourcing", "freight", "customs", "tracking"] as const;

/** Four disciplines as tabs: hover, click or arrow keys switch the picture and the sentence. */
export function Services() {
  const t = useTranslations("home.services");
  const [active, setActive] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const next = e.key === "ArrowDown" || e.key === "ArrowRight" ? i + 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? i - 1 : null;
    if (next === null) return;
    e.preventDefault();
    const n = (next + SERVICES.length) % SERVICES.length;
    setActive(n);
    tabs.current[n]?.focus();
  };

  const key = SERVICES[active];

  return (
    <div id="services" className="mx-auto max-w-[900px] px-6 pb-20 pt-24 sm:pb-28">
      <Eyebrow tone="dark">{t("eyebrow")}</Eyebrow>
      <h2 className="hp-h2 mt-6 max-w-xl">{t("title")}</h2>

      <div className="mt-10 grid gap-8 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div role="tablist" aria-label={t("tabsLabel")} aria-orientation="vertical" className="flex flex-col gap-1">
          {SERVICES.map((s, i) => (
            <button
              key={s}
              ref={(el) => {
                tabs.current[i] = el;
              }}
              id={`hp-tab-${s}`}
              role="tab"
              type="button"
              aria-selected={i === active}
              aria-controls="hp-service-panel"
              tabIndex={i === active ? 0 : -1}
              onClick={() => setActive(i)}
              onMouseEnter={() => setActive(i)}
              onKeyDown={(e) => onKey(e, i)}
              className={`flex items-baseline gap-4 rounded-2xl px-4 py-4 text-left text-xl font-medium transition-colors sm:text-2xl ${
                i === active ? "bg-[var(--hp-dark-raised)] text-[var(--hp-on-dark)]" : "text-[var(--hp-on-dark-muted)] hover:text-[var(--hp-on-dark)]"
              }`}
            >
              <span className="rb-mono-s text-[var(--hp-primary)]">{String(i + 1).padStart(2, "0")}</span>
              {t(`items.${s}.title`)}
            </button>
          ))}
        </div>

        <div id="hp-service-panel" role="tabpanel" aria-labelledby={`hp-tab-${key}`}>
          <ImageSlot key={key} name={`service-${key}`} ratio="4/3" alt={t(`items.${key}.imageAlt`)} tone="dark" className="rounded-[var(--hp-radius-card)]" />
          <p className="mt-5 text-lg leading-relaxed text-[var(--hp-on-dark)]">{t(`items.${key}.body`)}</p>
        </div>
      </div>
    </div>
  );
}
