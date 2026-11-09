"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";

/** A row that scrolls sideways, by touch or with its two buttons. It never moves by itself. */
export function ProductCarousel({ label, children }: { label: string; children: ReactNode }) {
  const t = useTranslations("store.home");
  const list = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  const measure = useCallback(() => {
    const el = list.current;
    if (el) setEdges({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 8 });
  }, []);

  useEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

  const page = (direction: 1 | -1) => list.current?.scrollBy({ left: direction * list.current.clientWidth * 0.85 });
  const control = "absolute top-1/3 z-20 hidden size-11 place-items-center rounded-full border border-line bg-surface-raised text-ink shadow-[var(--shadow-1)] hover:border-ink disabled:hidden md:grid";

  return (
    <div className="relative">
      <ul ref={list} onScroll={measure} aria-label={label} className="st-scroller -mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2 sm:gap-4">
        {children}
      </ul>
      <button type="button" aria-label={t("previous")} disabled={edges.start} onClick={() => page(-1)} className={`${control} -left-3`}>
        <svg viewBox="0 0 20 20" aria-hidden className="size-4" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="m12 5-5 5 5 5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <button type="button" aria-label={t("next")} disabled={edges.end} onClick={() => page(1)} className={`${control} -right-3`}>
        <svg viewBox="0 0 20 20" aria-hidden className="size-4" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="m8 5 5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}
