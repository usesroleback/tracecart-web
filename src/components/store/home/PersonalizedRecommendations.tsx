import { getTranslations } from "next-intl/server";
import type { ProductCard as Card } from "@/lib/store";
import { ForgetSeen } from "../SaveCompare";
import { ProductCollection } from "./ProductCollection";

/**
 * What this device viewed, when it viewed something; otherwise what's in stock.
 * Each is named for what it is: nothing here claims to be tailored to anyone.
 */
export async function PersonalizedRecommendations({ seen, inStock, inStockTitle, inStockHref }: { seen?: Card[]; inStock?: Card[]; inStockTitle: string; inStockHref: string }) {
  const t = await getTranslations("store.home");
  if (seen?.length) return <ProductCollection id="home-seen" title={t("seenTitle")} items={seen} layout="carousel" action={<ForgetSeen label={t("seenClear")} />} />;
  return <ProductCollection id="home-local" title={inStockTitle} items={inStock} href={inStockHref} />;
}
