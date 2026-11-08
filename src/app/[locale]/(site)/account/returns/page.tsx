import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { StoreShell } from "@/components/store/StoreShell";
import { MyReturnsList } from "@/components/returns/MyReturns";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "returns" });
  return { title: t("myReturns"), robots: { index: false, follow: false } };
}

export default function ReturnsPage() {
  return (
    <StoreShell>
      <MyReturnsList />
    </StoreShell>
  );
}
