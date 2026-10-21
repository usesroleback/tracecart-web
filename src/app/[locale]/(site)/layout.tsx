import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthProvider } from "@/components/auth/AuthProvider";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "site.meta" });

  return {
    title: t("title"),
    description: t("description"),
  };
}

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  // Customers sign up / in from the site (homepage finder, /account).
  return (
    <AuthProvider>
      <div className="bg-surface text-ink">{children}</div>
    </AuthProvider>
  );
}
