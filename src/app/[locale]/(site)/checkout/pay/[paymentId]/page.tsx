import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { StoreShell } from "@/components/store/StoreShell";
import { FakePay } from "@/components/checkout/FakePay";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "checkout" });
  return { title: t("meta.pay"), robots: { index: false, follow: false } };
}

export default async function FakePayPage({ params }: { params: Promise<{ paymentId: string }> }) {
  const { paymentId } = await params;
  return (
    <StoreShell>
      <FakePay paymentId={paymentId} />
    </StoreShell>
  );
}
