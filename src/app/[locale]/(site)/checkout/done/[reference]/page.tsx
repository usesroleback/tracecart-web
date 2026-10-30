import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { StoreShell } from "@/components/store/StoreShell";
import { OrderDetail } from "@/components/checkout/OrderDetail";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "checkout" });
  return { title: t("meta.order"), robots: { index: false, follow: false } };
}

export default async function DonePage({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  return (
    <StoreShell search={false}>
      <OrderDetail reference={reference} confirmation />
    </StoreShell>
  );
}
