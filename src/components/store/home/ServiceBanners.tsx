import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { QuoteBar } from "@/components/site/QuoteBar";
import { tintVar } from "./images";

/** "Looking for something hard to find?": the finder itself, ready to use. */
export async function SourcingBanner({ need }: { need: string }) {
  const t = await getTranslations("store.home.sourcing");
  return (
    <section id="home-finder-section" aria-labelledby="home-finder" style={{ background: tintVar("mint") }} className="mt-12 rounded-[var(--hp-corner-panel)] px-5 py-10 sm:px-10">
      <h2 id="home-finder" className="rb-headline max-w-[24ch] text-[28px] leading-[1.08] sm:text-[38px]">
        {t("title")}
      </h2>
      <p className="mt-3 max-w-2xl text-ink-muted">{t("lead")}</p>
      <div className="mt-6 max-w-2xl scroll-mt-28">
        <QuoteBar initialWhat={need} />
      </div>
      <Link href="/find" className="mt-5 inline-block font-medium text-ink underline underline-offset-4">
        {t("cta")}
      </Link>
    </section>
  );
}

/** "Already have your goods?": short, so shipping doesn't take over the shop. */
export async function ShippingBanner() {
  const t = await getTranslations("store.home.shipping");
  return (
    <section aria-labelledby="home-ship" className="mt-6 grid items-stretch overflow-hidden rounded-[var(--radius-m)] border border-line bg-surface-raised sm:grid-cols-[1fr_2fr]">
      <div className="relative h-36 sm:h-auto">
        <Image src="/images/home/service-freight.jpg" alt="" fill sizes="(min-width: 640px) 33vw, 100vw" className="object-cover" />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-7">
        <div>
          <h2 id="home-ship" className="rb-title-l">
            {t("title")}
          </h2>
          <p className="mt-1 max-w-lg text-sm text-ink-muted">{t("lead")}</p>
        </div>
        <Link href="/freight" className="inline-flex h-11 items-center rounded-[var(--radius-s)] border border-ink px-5 font-medium text-ink hover:bg-ink hover:text-ink-inverse">
          {t("cta")}
        </Link>
      </div>
    </section>
  );
}
