import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { StoreShell } from "@/components/store/StoreShell";
import { ProductList } from "@/components/store/ProductCard";
import { STORE_CURRENCY, storeApi, storeCountry } from "@/lib/store";
import { alternates } from "@/lib/siteUrl";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "store.meta" });
  return { title: t("dealsTitle"), description: t("dealsDescription"), alternates: await alternates("/deals", locale) };
}

/** Products with a live deal (ADR-070), ending soonest first. */
export default async function Deals({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations("store.deals");
  const { data } = await storeApi(locale).GET("/catalog/deals", { params: { query: { country: await storeCountry(), currency: STORE_CURRENCY } } });
  const items = data?.items ?? [];
  return (
    <StoreShell>
      <h1 className="rb-headline text-[30px] sm:text-[40px]">{t("title")}</h1>
      <p className="mt-2 text-ink-muted">{t("lead")}</p>
      <div className="mt-8">{items.length ? <ProductList products={items} priorityFirst={4} /> : <p className="text-ink-muted">{t("empty")}</p>}</div>
    </StoreShell>
  );
}
