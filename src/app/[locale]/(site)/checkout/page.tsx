import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { StoreShell } from "@/components/store/StoreShell";
import { Checkout } from "@/components/checkout/Checkout";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "checkout" });
  return { title: t("meta.checkout"), robots: { index: false, follow: false } };
}

export default function CheckoutPage() {
  return (
    <StoreShell search={false}>
      <Checkout />
    </StoreShell>
  );
}
