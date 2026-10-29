import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { HomePage } from "@/components/site/home/HomePage";
import { alternates } from "@/lib/siteUrl";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "home.meta" });
  return { title: t("title"), description: t("description"), alternates: await alternates("/about", locale) };
}

/** How Tracecart works: what it does, the process and the finder (the store's home is /). */
export default function About() {
  return <HomePage />;
}
