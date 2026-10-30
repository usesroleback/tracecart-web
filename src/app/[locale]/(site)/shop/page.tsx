import { permanentRedirect } from "next/navigation";

/** The live-search shop was replaced by the store (docs ADR-031): old links land on the catalogue. */
export default async function ShopPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  permanentRedirect(`/${locale}/c`);
}
