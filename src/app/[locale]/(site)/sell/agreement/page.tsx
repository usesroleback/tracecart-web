import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LegalPage } from "@/components/legal/LegalPage";
import { alternates } from "@/lib/siteUrl";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "legal.sellerAgreement" });
  return { title: t("title"), description: t("lead"), alternates: await alternates("/sell/agreement", locale) };
}

// The version shown here is the one the API asks sellers to accept (ADR-096).
export default function Page() {
  return <LegalPage page="sellerAgreement" />;
}
