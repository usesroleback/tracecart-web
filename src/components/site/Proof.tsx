import { useTranslations } from "next-intl";

const STAT_KEYS = ["shipments", "dwellTime", "delivered"] as const;

export function Proof() {
  const t = useTranslations("site.proof");

  return (
    <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-24">
      <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-16">
        <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-s)] bg-surface-sunken">
          <div
            className="absolute inset-0 opacity-60"
            style={{
              backgroundImage: "repeating-linear-gradient(135deg, var(--color-line) 0px, var(--color-line) 1px, transparent 1px, transparent 14px)",
            }}
          />
          <p className="absolute bottom-4 left-4 right-4 rounded-[var(--radius-xs)] bg-surface-raised px-3 py-2 text-xs text-ink-muted shadow-[var(--shadow-1)]">
            {t("photoCaption")}
          </p>
        </div>

        <div className="space-y-8">
          {STAT_KEYS.map((key) => (
            <div key={key}>
              <p className="rb-numeral-l">{t(`stats.${key}.value`)}</p>
              <p className="mt-1 text-sm text-ink-muted">{t(`stats.${key}.label`)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
