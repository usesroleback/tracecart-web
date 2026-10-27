import { useTranslations } from "next-intl";
import { QuoteBar } from "@/components/site/QuoteBar";

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

