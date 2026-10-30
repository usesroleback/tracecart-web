import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { StoreShell } from "@/components/store/StoreShell";
import { OrdersList } from "@/components/checkout/OrdersList";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "checkout" });
  return { title: t("meta.orders"), robots: { index: false, follow: false } };
}

export default function OrdersPage() {
  return (
    <StoreShell search={false}>
      <OrdersList />
    </StoreShell>
  );
}
