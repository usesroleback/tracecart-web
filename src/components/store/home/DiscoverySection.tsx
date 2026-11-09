import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PhotoDrop } from "./PhotoDrop";
import { tintVar } from "./images";

/** "Find it from a picture": a working upload, and a labelled example of what Tracey reads. */
export async function PictureDiscovery() {
  const t = await getTranslations("store.home.picture");
  const steps = ["one", "two", "three"] as const;
  const read = t.raw("exampleRead") as string[];
  return (
    <section aria-labelledby="home-photo" className="hp-panel !mx-0 mt-12 grid gap-8 bg-[var(--hp-dark-deep)] p-5 text-[var(--hp-on-dark)] sm:p-10 lg:grid-cols-[1fr_1fr] lg:items-center">
      <div className="relative mx-auto aspect-[4/3] w-full max-w-lg overflow-hidden rounded-[var(--radius-m)]">
        <Image src="/images/discovery/photo-example.jpg" alt={t("exampleAlt")} fill sizes="(min-width: 1024px) 40vw, 90vw" className="object-cover" />
        <span aria-hidden className="absolute inset-[12%] rounded-[var(--radius-s)] border-2 border-[var(--color-accent)]" />
        <div className="absolute inset-x-3 bottom-3 rounded-[var(--radius-s)] bg-black/75 p-3 text-sm text-white">
          <p className="rb-overline !text-white">{t("exampleLabel")}</p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {read.map((r) => (
              <li key={r} className="rounded-[var(--radius-xs)] bg-white/15 px-2 py-0.5">
                {r}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div>
        <p className="rb-overline text-[var(--hp-on-dark-muted)]">{t("eyebrow")}</p>
        <h2 id="home-photo" className="rb-headline mt-2 max-w-[20ch] text-[28px] leading-[1.08] sm:text-[40px]">
          {t("title")}
        </h2>
        <ol className="mt-5 grid gap-2 text-[var(--hp-on-dark-muted)]">
          {steps.map((s, i) => (
            <li key={s} className="flex gap-3">
              <span className="rb-mono-s pt-0.5 text-[var(--color-accent)]">{i + 1}</span>
              {t(`steps.${s}`)}
            </li>
          ))}
        </ol>
        <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto]">
          <PhotoDrop tone="dark" />
          <Link href="/s/ai" className="inline-flex min-h-12 items-center justify-center rounded-[var(--radius-s)] bg-[var(--color-accent)] px-5 font-medium text-[var(--color-on-accent)] hover:opacity-90">
            {t("cta")}
          </Link>
        </div>
      </div>
    </section>
  );
}

/** "Find what goes with it": searches that really run, for what someone already owns. */
export async function OwnedDiscovery() {
  const t = await getTranslations("store.home.owned");
  const examples = t.raw("examples") as string[];
  return (
    <section aria-labelledby="home-owned" style={{ background: tintVar("butter") }} className="mt-12 grid gap-6 rounded-[var(--hp-corner-panel)] p-5 sm:p-10 lg:grid-cols-[5fr_6fr] lg:items-center">
      <div>
        <p className="rb-overline text-ink-muted">{t("eyebrow")}</p>
        <h2 id="home-owned" className="rb-headline mt-2 max-w-[18ch] text-[28px] leading-[1.08] sm:text-[38px]">
          {t("title")}
        </h2>
        <p className="mt-3 max-w-md text-ink-muted">{t("lead")}</p>
        <Link href="/parts" className="mt-5 inline-flex h-11 items-center rounded-[var(--radius-s)] bg-ink px-5 font-medium text-ink-inverse hover:opacity-90">
          {t("cta")}
        </Link>
      </div>
      <ul className="grid gap-2">
        {examples.map((e) => (
          <li key={e}>
            <Link href={`/s/ai?q=${encodeURIComponent(e)}`} className="st-tile flex items-center justify-between gap-3 rounded-[var(--radius-s)] bg-surface-raised px-4 py-3.5 font-medium text-ink">
              {e}
              <svg viewBox="0 0 20 20" aria-hidden className="size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m8 5 5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
