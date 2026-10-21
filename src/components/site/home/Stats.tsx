import { useTranslations } from "next-intl";
import { STATS } from "./content";
import { Eyebrow } from "./primitives";
import { CountUp } from "./motion";

export function Stats() {
  const t = useTranslations("home.stats");

  return (
    <section aria-labelledby="hp-stats" className="mx-auto max-w-[900px] px-6 pb-20 text-center sm:pb-28">
      <h2 id="hp-stats" className="sr-only">
        {t("eyebrow")}
      </h2>
      <div aria-hidden>
        <Eyebrow>{t("eyebrow")}</Eyebrow>
      </div>
      <dl className="mt-10 grid gap-10 sm:grid-cols-3">
        {STATS.map((s) => (
          <div key={s.key} className="flex flex-col items-center gap-3">
            <dt className="max-w-[22ch] text-[15px] leading-snug text-[var(--hp-text-muted)]">{t(s.key)}</dt>
            <dd className="order-first text-6xl sm:text-7xl">
              <CountUp figure={s.figure} className="hp-numeral" suffixClassName="text-[var(--hp-secondary-ink)]" />
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
