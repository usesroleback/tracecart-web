import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { ShipArea } from "./ShipArea";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("ship");
  return { title: t("meta.title") };
}

/** Goods the customer already has, moved from a pickup address to a delivery address. */
export default function ShipPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto min-h-[60vh] max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
        <ShipArea />
      </main>
      <SiteFooter />
    </>
  );
}
