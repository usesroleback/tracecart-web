"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Eyebrow, ImageSlot } from "./primitives";
import { prefersReducedMotion } from "./motion";

/** The statement lights up word by word as it scrolls through the middle of the screen. */
function Statement({ parts }: { parts: { text: string; accent?: boolean }[] }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const words = parts.flatMap((p) => p.text.split(" ").map((w) => ({ w, accent: !!p.accent })));
  const [lit, setLit] = useState(words.length);

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      // 0 when the top enters at 85% of the screen, 1 when the bottom reaches 45%.
      const start = vh * 0.85;
      const end = vh * 0.45;
      const progress = (start - r.top) / (start - end + r.height);
      setLit(Math.round(Math.min(1, Math.max(0, progress)) * words.length));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [words.length]);

  return (
    <p ref={ref} className="hp-statement max-w-[22ch] sm:max-w-none">
      {words.map(({ w, accent }, i) => (
        <span key={i} className={`hp-word ${accent ? "hp-word--accent" : ""} ${i < lit ? "is-lit" : ""}`}>
          {w}{" "}
        </span>
      ))}
    </p>
  );
}

export function PointOfView() {
  const t = useTranslations("home.pov");

  return (
    <div className="mx-auto max-w-[900px] px-6 pt-20 sm:pt-28">
      <Eyebrow tone="dark">{t("eyebrow")}</Eyebrow>
      <div className="mt-8">
        <Statement parts={[{ text: t("before") }, { text: t("accent"), accent: true }, { text: t("after") }]} />
      </div>
      <div className="mt-12 flex flex-col gap-6 sm:flex-row sm:items-center">
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((n) => (
            <ImageSlot key={n} name={`team-${n}`} ratio="1/1" alt={t("teamAlt")} tone="dark" className="w-16 rounded-[var(--hp-radius-card)] sm:w-20 [&>span]:text-[9px]" />
          ))}
        </div>
        <p className="max-w-sm text-[15px] leading-relaxed text-[var(--hp-on-dark-muted)]">{t("team")}</p>
      </div>
    </div>
  );
}
