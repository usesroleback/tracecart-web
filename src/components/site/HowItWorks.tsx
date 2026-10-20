import { useTranslations } from "next-intl";

const STEP_KEYS = ["source", "consolidate", "move", "clear", "deliver"] as const;
const STEP_NUMBERS = ["01", "02", "03", "04", "05"] as const;

export function HowItWorks() {
  const t = useTranslations("site.howItWorks");

  return (
    <section id="how-it-works" className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-24">
      <p className="rb-overline">{t("overline")}</p>
      <h2 className="rb-headline mt-2 max-w-xl">{t("title")}</h2>

      <div className="mt-10 grid border-t border-ink sm:grid-cols-5">
        {STEP_KEYS.map((key, i) => (
          <div
            key={key}
            className={`border-b border-line py-6 pr-6 sm:border-b-0 sm:py-8 ${i > 0 ? "sm:border-l sm:pl-6" : ""} ${
              STEP_NUMBERS[i] === "03" ? "relative before:absolute before:-top-px before:left-0 before:h-0.5 before:w-full before:bg-accent" : ""
            }`}
          >
            <p className="rb-mono-s text-ink-muted">{STEP_NUMBERS[i]}</p>
            <p className="rb-title mt-2 text-[18px]">{t(`steps.${key}.title`)}</p>
            <p className="mt-1.5 text-sm text-ink-muted">{t(`steps.${key}.body`)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
