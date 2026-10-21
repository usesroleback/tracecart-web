import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { HomePage } from "@/components/site/home/HomePage";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "home.meta" });
  // A preview with placeholder figures and stories: kept out of search engines.
  return { title: t("title"), description: t("description"), robots: { index: false, follow: false } };
}

export default function HomePreviewPage() {
  return <HomePage />;
}
