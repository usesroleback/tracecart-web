import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SiteShell } from "@/components/site/home/SiteShell";
import { ShopArea } from "./ShopArea";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("shop");
  return { title: t("meta.title") };
}

/** The catalogue as a shop: products delivered to the customer's country, at one price. */
export default function ShopPage() {
  return (
    <SiteShell>
      <main className="mx-auto min-h-[60vh] max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
        <ShopArea />
      </main>
    </SiteShell>
  );
}
