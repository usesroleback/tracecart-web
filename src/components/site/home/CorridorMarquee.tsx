import { useTranslations } from "next-intl";
import { CORRIDORS } from "./content";

/**
 * The band tucked under the dark panel: corridors we run, with transit
 * times. City names are proper nouns, not translated.
 */
export function CorridorMarquee() {
  const t = useTranslations("home.corridors");
  const items = CORRIDORS.map((c) => (
    <>
      <span className="font-semibold">
        {c.from} → {c.to}
      </span>
      <span className="rb-mono-s opacity-70" data-placeholder="figure">
        {t("days", { min: c.daysMin, max: c.daysMax })}
      </span>
    </>
  ));

  return (
    <section aria-label={t("label")} className="relative z-0 mx-[var(--hp-gutter)] -mt-8 rounded-b-[var(--hp-radius-chip)] bg-[var(--hp-secondary)] pb-5 pt-13 text-[var(--hp-text)]">
      <h2 className="sr-only">{t("label")}</h2>
      <ul className="sr-only">
        {CORRIDORS.map((c) => (
          <li key={`${c.from}-${c.to}`}>
            {c.from} → {c.to}, {t("days", { min: c.daysMin, max: c.daysMax })}
          </li>
        ))}
      </ul>
      <div className="hp-marquee" aria-hidden style={{ ["--hp-marquee-duration" as string]: "50s" }}>
        <div className="hp-marquee__track">
          {[...items, ...items].map((item, i) => (
            <span key={i} className="flex items-center gap-3 whitespace-nowrap pr-8 text-lg">
              <span className="grid size-5 place-items-center rounded-full bg-[var(--hp-primary)]">
                <span className="size-1.5 rounded-full bg-[var(--hp-on-primary)]" />
              </span>
              {item}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
