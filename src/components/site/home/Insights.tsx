import { useTranslations } from "next-intl";
import { INSIGHTS } from "./content";
import { Eyebrow, ImageSlot, PillLink } from "./primitives";

export function Insights() {
  const t = useTranslations("home.insights");
  const [featured, ...rest] = INSIGHTS;
  const meta = (n: (typeof INSIGHTS)[number]) => `${t(`items.${n.key}.category`)} · ${t("readTime", { minutes: n.minutes })}`;

  return (
    <section id="insights" aria-labelledby="hp-insights" className="mx-auto max-w-[1200px] px-6 pb-20 sm:pb-28">
      <Eyebrow>{t("eyebrow")}</Eyebrow>
      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <h2 id="hp-insights" className="hp-h2">
          {t("title")}
        </h2>
        {/* TODO: the notes index doesn't exist yet. */}
        <PillLink href="#">{t("all")}</PillLink>
      </div>

      <div className="mt-10 grid gap-4 lg:grid-cols-[3fr_2fr]">
        {/* TODO: link each note once the blog exists. */}
        <a href="#" className="group relative block overflow-hidden rounded-[var(--hp-radius-card)]">
          <ImageSlot name={`insight-${featured.key}`} ratio="4/3" alt={t(`items.${featured.key}.imageAlt`)} tone="dark" className="h-full min-h-[360px] w-full [&>span]:absolute [&>span]:right-4 [&>span]:top-4" />
          <span className="absolute left-4 top-4 rounded-full bg-[var(--hp-primary)] px-3 py-1 text-xs font-semibold text-[var(--hp-on-primary)]">{t("featured")}</span>
          <div className="absolute inset-x-0 bottom-0 p-6 text-white">
            <p className="text-sm text-white/70">{meta(featured)}</p>
            <h3 className="mt-2 max-w-[24ch] text-2xl font-semibold leading-tight tracking-tight group-hover:underline sm:text-3xl">{t(`items.${featured.key}.title`)}</h3>
          </div>
        </a>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 lg:content-center lg:gap-10">
          {rest.map((n) => (
            <a key={n.key} href="#" className="group flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
              <ImageSlot name={`insight-${n.key}`} ratio="16/10" alt={t(`items.${n.key}.imageAlt`)} className="w-full shrink-0 rounded-[20px] lg:w-[45%]" />
              <div>
                <p className="text-sm text-[var(--hp-text-muted)]">{meta(n)}</p>
                <h3 className="mt-1 text-lg font-semibold leading-snug tracking-tight group-hover:underline">{t(`items.${n.key}.title`)}</h3>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
