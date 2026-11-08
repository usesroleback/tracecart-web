import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { StoreShell } from "@/components/store/StoreShell";
import { CompanyRfq } from "@/components/b2b/Rfq";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "b2b.rfq" });
  return { title: t("title"), robots: { index: false, follow: false } };
}

export default function CompanyRfqPage() {
  return (
    <StoreShell>
      <CompanyRfq />
    </StoreShell>
  );
}
