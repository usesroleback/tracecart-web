import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SiteShell } from "@/components/site/home/SiteShell";
import { QuoteBar } from "@/components/site/QuoteBar";
import { FeaturedProducts } from "@/components/site/FeaturedProducts";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("shop");
  return { title: t("meta.title") };
}

/**
 * The shop is the search: what the customer describes, photographs or films
 * is found live, ranked by accuracy then price, and priced delivered to their
 * country (docs/design/use-case-3-buy-from-the-catalogue.md).
 */
export default async function ShopPage() {
  const t = await getTranslations("shop");
  return (
    <SiteShell>
      <main className="mx-auto min-h-[60vh] max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
        <h1 className="rb-headline mb-6 text-[32px] sm:text-[40px]">{t("title")}</h1>
        <QuoteBar />
        <FeaturedProducts />
      </main>
    </SiteShell>
  );
}
