import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { StoreShell } from "@/components/store/StoreShell";
import { CartView } from "@/components/store/CartView";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "checkout.cart" });
  return { title: t("title"), robots: { index: false, follow: false } };
}

export default function CartPage() {
  return (
    <StoreShell>
      <CartView />
    </StoreShell>
  );
}
