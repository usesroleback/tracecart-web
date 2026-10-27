import { useTranslations } from "next-intl";
import { QuoteBar } from "@/components/site/QuoteBar";
import { Eyebrow, ImageSlot } from "./primitives";
import { HeroShowcase } from "./HeroShowcase";

/** The chip inside the headline: a parcel on its way (»»). Decorative: the sentence reads without it. */
function ParcelChip() {
  return (
    <span
      aria-hidden
      className="inline-flex h-[0.86em] translate-y-[0.06em] items-center gap-[0.12em] rounded-[var(--hp-radius-control)] bg-[var(--hp-dark)] py-[0.08em] pl-[0.08em] pr-[0.22em] align-baseline"
    >
      <span className="grid aspect-square h-full place-items-center rounded-full bg-[var(--hp-primary)] text-[var(--hp-on-primary)]">
        <svg viewBox="0 0 24 24" aria-hidden className="h-[55%] w-[55%]" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round">
          <path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5z" />
          <path d="M3.5 7.5 12 12l8.5-4.5M12 12v9" />
        </svg>
      </span>
      <svg viewBox="0 0 24 12" aria-hidden className="h-[0.32em] text-[var(--hp-on-dark)]" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 2l4 4-4 4M10 2l4 4-4 4" />
        <path d="M18 2l4 4-4 4" opacity="0.4" />
      </svg>
    </span>
  );
}

export function HomeHero() {
  const t = useTranslations("home.hero");

  return (
    <section id="top" className="mx-[var(--hp-gutter)] mt-3 rounded-[var(--hp-corner-panel)] bg-[var(--hp-light-sunken)] px-4 pb-4 pt-14 sm:px-6 sm:pt-20">
      <div className="mx-auto flex max-w-5xl flex-col items-center text-center">
        <Eyebrow tone="raised">{t("eyebrow")}</Eyebrow>
        <h1 className="hp-h1 mt-6 text-balance">
          {t("titleBefore")} <ParcelChip /> {t("titleAfter")}
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-[var(--hp-text-muted)]">
          <span className="mx-0.5 inline-block rounded-[var(--hp-radius-chip)] bg-[var(--hp-secondary)] px-3 py-0.5 font-medium text-[var(--hp-text)]">{t("subtitleChip1")}</span>{" "}
          <span className="mx-0.5 inline-block rounded-[var(--hp-radius-chip)] bg-[var(--hp-light-raised)] px-3 py-0.5 font-medium text-[var(--hp-text)]">{t("subtitleChip2")}</span>{" "}
          <span className="mx-0.5 inline-block rounded-[var(--hp-radius-chip)] bg-[var(--hp-dark)] px-3 py-0.5 font-medium text-[var(--hp-on-dark)]">{t("subtitleChip3")}</span>{" "}
          {t("subtitleRest")}
        </p>
        {/* The finder itself (#quote), where every "Find what you need" on the page lands; it links to /ship too. */}
        <div className="mt-10 w-full max-w-2xl scroll-mt-28 text-left">
          <QuoteBar />
        </div>
      </div>

      {/* Taller on phones, so the showcase card fits over the photo. */}
      <ImageSlot name="hero-arrival" ratio="16/9" alt={t("imageAlt")} className="mt-12 rounded-[var(--hp-corner-media)] max-sm:aspect-[3/4] lg:aspect-[21/9]">
        <HeroShowcase />
      </ImageSlot>
    </section>
  );
}
