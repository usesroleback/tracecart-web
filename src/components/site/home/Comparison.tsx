import { useTranslations } from "next-intl";
import { Eyebrow, PillLink } from "./primitives";
import { Reveal } from "./motion";

const ROWS = ["price", "tracking", "space"] as const;

function Cross() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className="mt-0.5 size-4 shrink-0 text-[var(--hp-on-dark-muted)]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="m4 4 8 8M12 4l-8 8" />
    </svg>
  );
}

function Check() {
  return (
    <span aria-hidden className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-[var(--hp-primary)] text-[var(--hp-on-primary)]">
      <svg viewBox="0 0 16 16" className="size-3" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m3.5 8.5 3 3 6-7" />
      </svg>
    </span>
  );
}

export function Comparison({ cta }: { cta: string }) {
  const t = useTranslations("home.compare");

  return (
    <section aria-labelledby="hp-compare" className="hp-panel hp-grid-lines px-6 py-20 sm:py-28">
      <div className="mx-auto max-w-[900px]">
        <div className="text-center">
          <Eyebrow tone="dark">{t("eyebrow")}</Eyebrow>
          <h2 id="hp-compare" className="hp-h2 mx-auto mt-6 max-w-[16ch] text-balance">
            {t("title")}
          </h2>
        </div>

        <Reveal className="mt-12">
          <div className="relative grid grid-cols-2 gap-3">
            <p className="rounded-[var(--hp-radius-control)] bg-[var(--hp-dark-raised)] px-4 py-3 text-center text-sm font-medium text-[var(--hp-on-dark-muted)]">{t("them")}</p>
            <p className="grid place-items-center rounded-[var(--hp-radius-control)] bg-[var(--hp-primary)] px-4 py-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/logo/tracecart-lockup.svg" alt="Tracecart" width={116} height={16} className="h-4 w-auto" />
            </p>
            <span aria-hidden className="absolute left-1/2 top-1/2 grid size-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-[var(--hp-radius-chip)] border-4 border-[var(--hp-dark)] bg-white text-xs font-bold uppercase text-[#0d0f0e]">
              {t("vs")}
            </span>
          </div>

          <div className="mt-6 grid gap-x-10 gap-y-0 md:grid-cols-2">
            <ul aria-label={t("no")} className="divide-y divide-white/10">
              {ROWS.map((r) => (
                <li key={r} className="flex gap-3 py-4 text-[15px] text-[var(--hp-on-dark-muted)]">
                  <Cross />
                  {t(`rows.${r}.them`)}
                </li>
              ))}
            </ul>
            <ul aria-label={t("yes")} className="divide-y divide-white/10 max-md:mt-6 max-md:border-t max-md:border-white/10">
              {ROWS.map((r) => (
                <li key={r} className="flex gap-3 py-4 text-[15px] font-medium text-[var(--hp-on-dark)]">
                  <Check />
                  {t(`rows.${r}.us`)}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-10 flex justify-center">
            <PillLink href="#quote" tone="primary">
              {cta}
            </PillLink>
          </div>
        </Reveal>

      </div>
    </section>
  );
}
