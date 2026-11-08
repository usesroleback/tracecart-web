import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { StoreShell } from "@/components/store/StoreShell";
import { BulkCart } from "@/components/b2b/BulkCart";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "b2b.bulk" });
  return { title: t("title"), robots: { index: false, follow: false } };
}

export default function CompanyCartPage() {
  return (
    <StoreShell>
      <BulkCart />
    </StoreShell>
  );
}
