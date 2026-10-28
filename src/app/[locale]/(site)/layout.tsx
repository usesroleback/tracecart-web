import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { cookies } from "next/headers";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { CountryProvider } from "@/context/CountryContext";
import { COUNTRY_COOKIE, isCountryCode } from "@/lib/country";

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

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  // The visitor's country, once known (see CountryProvider): it sets the language and where prices are delivered to.
  const saved = (await cookies()).get(COUNTRY_COOKIE)?.value;
  // Customers sign up / in from the site (homepage finder, /account).
  return (
    <AuthProvider>
      <CountryProvider initialCountry={isCountryCode(saved) ? saved : null}>
        <div className="bg-surface text-ink">{children}</div>
      </CountryProvider>
    </AuthProvider>
  );
}
