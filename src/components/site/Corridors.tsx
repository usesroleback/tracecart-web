import { useTranslations } from "next-intl";

// Representative corridors spanning West Africa, Central Asia, inland South
// America, East Africa and landlocked Europe — never just one region/continent
// (docs/brand/tracecart-brand-guidelines.md: "never as an African logistics
// startup; corridor examples always span several continents"). City names and
// coordinates are proper nouns/data, not translatable text — only the "X–Y
// days" phrasing goes through site.corridors.dayRange.
const CORRIDORS = [
  { from: "Lomé", to: "Ouagadougou", daysMin: 5, daysMax: 8, coords: "12.3714° N, 1.5197° W" },
  { from: "Mersin", to: "Almaty", daysMin: 11, daysMax: 16, coords: "43.2389° N, 76.8897° E" },
  { from: "Antofagasta", to: "Santa Cruz", daysMin: 6, daysMax: 9, coords: "17.7833° S, 63.1821° W" },
  { from: "Mombasa", to: "Kampala", daysMin: 4, daysMax: 6, coords: "0.3476° N, 32.5825° E" },
  { from: "Hamburg", to: "Bratislava", daysMin: 3, daysMax: 4, coords: "48.1486° N, 17.1077° E" },
  { from: "Durban", to: "Lusaka", daysMin: 7, daysMax: 10, coords: "15.3875° S, 28.3228° E" },
] as const;

export function Corridors() {
  const t = useTranslations("site.corridors");

  return (
    <section id="corridors" className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-24">
      <div className="flex items-end justify-between gap-4">
        <h2 className="sq-headline">{t("title")}</h2>
        <span className="hidden text-sm text-ink-muted sm:block">{t("allCorridors")}</span>
      </div>

      <div className="mt-8 grid gap-x-10 gap-y-6 border-t border-line pt-6 sm:grid-cols-2">
        {CORRIDORS.map((c) => (
          <div key={`${c.from}-${c.to}`} className="flex items-baseline justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-ink">
                {c.from} <span className="text-ink-muted">→</span> {c.to}
              </p>
              <p className="mt-0.5 text-xs text-ink-muted">
                {t("dayRange", { min: c.daysMin, max: c.daysMax })}
              </p>
            </div>
            <p className="sq-mono-s whitespace-nowrap text-ink-muted">{c.coords}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
