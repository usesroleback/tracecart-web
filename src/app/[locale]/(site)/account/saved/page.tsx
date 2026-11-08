import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { StoreShell } from "@/components/store/StoreShell";
import { SavedList } from "@/components/store/SavedList";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "store.saved" });
  return { title: t("title"), robots: { index: false, follow: false } };
}

export default function SavedPage() {
  return (
    <StoreShell>
      <SavedList />
    </StoreShell>
  );
}
