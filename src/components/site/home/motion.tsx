"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useLocale } from "next-intl";
import { figureParts, formatFigure, type Figure } from "./content";

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** True once the element has scrolled into view (and stays true). */
export function useInView<T extends Element>(threshold = 0.25) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return [ref, inView] as const;
}

/** Fades and lifts its children in when they scroll into view. */
export function Reveal({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const [ref, inView] = useInView<HTMLDivElement>(0.2);
  return (
    <div ref={ref} className={`hp-reveal ${inView ? "is-in" : ""} ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

/**
 * A figure that counts up from zero when it comes into view. The final value
 * is what screen readers and the server render read; only the visible digits
 * animate. `suffixClassName` styles the "+" or "%" apart.
 */
export function CountUp({
  figure,
  duration = 1400,
  className = "",
  suffixClassName,
}: {
  figure: Figure;
  duration?: number;
  className?: string;
  suffixClassName?: string;
}) {
  const locale = useLocale();
  const [ref, inView] = useInView<HTMLSpanElement>(0.4);
  const [shown, setShown] = useState<number | null>(null);

  useEffect(() => {
    if (!inView || prefersReducedMotion()) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(t < 1 ? figure.value * eased : null);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, figure.value, duration]);

  const { body, suffix } = figureParts(figure, locale, shown ?? figure.value);
  return (
    <span ref={ref} data-placeholder="figure" className={className}>
      <span aria-hidden>
        {body}
        <span className={suffixClassName}>{suffix}</span>
      </span>
      <span className="sr-only">{formatFigure(figure, locale)}</span>
    </span>
  );
}
