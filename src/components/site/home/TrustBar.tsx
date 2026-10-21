import { useTranslations } from "next-intl";
import { QuoteBar } from "@/components/site/QuoteBar";
import { TRUST } from "./content";
import { ImageSlot, Placeholder } from "./primitives";

/** The existing finder, where every "Get a delivered price" lands (#quote). */
export function FinderSection() {
  const t = useTranslations("home.finder");
  return (
    <section aria-labelledby="hp-finder" className="mx-auto max-w-3xl scroll-mt-28 px-4 pt-16 sm:px-6">
      <h2 id="hp-finder" className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">
        {t("title")}
      </h2>
      <p className="mx-auto mt-2 max-w-xl text-center text-[var(--hp-text-muted)]">{t("body")}</p>
      <div className="mt-6 scroll-mt-28">
        <QuoteBar />
      </div>
    </section>
  );
}

export function TrustBar() {
  const t = useTranslations("home.trust");
  const logos = Array.from({ length: TRUST.logos }, (_, i) => i + 1);

  return (
    <section className="mx-auto flex max-w-[1400px] flex-col gap-6 px-6 py-14 md:flex-row md:items-center md:gap-10">
      <div className="flex shrink-0 items-center gap-4 md:max-w-xs">
        <div className="flex -space-x-3">
          {Array.from({ length: TRUST.avatars }, (_, i) => (
            <ImageSlot
              key={i}
              name={`trust-avatar-${i + 1}`}
              alt={t("avatarAlt")}
              className="size-11 rounded-full ring-2 ring-[var(--hp-light)] [&>span]:hidden"
            />
          ))}
        </div>
        <p className="text-sm leading-snug text-[var(--hp-text-muted)]">
          <Placeholder>{t("text", { customers: TRUST.customers, corridors: TRUST.corridors })}</Placeholder>
        </p>
      </div>
      <div className="hp-marquee min-w-0 flex-1" style={{ ["--hp-marquee-duration" as string]: "36s" }}>
        <ul className="hp-marquee__track gap-4">
          {[...logos, ...logos].map((n, i) => (
            <li key={i} aria-hidden={i >= logos.length || undefined}>
              <ImageSlot name={`client-logo-${n}`} ratio="3/1" alt={t("logoAlt")} className="w-36 rounded-xl grayscale" />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
