import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { StoreShell } from "@/components/store/StoreShell";
import { FreightDetail } from "@/components/services/FreightDetail";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "services.freightRequest" });
  return { title: t("title"), robots: { index: false, follow: false } };
}

export default async function Page({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  return (
    <StoreShell search={false}>
      <FreightDetail reference={reference} />
    </StoreShell>
  );
}
