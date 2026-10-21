import { ClerkProvider } from "@clerk/nextjs";
import { enUS, frFR } from "@clerk/localizations";
import { getLocale } from "next-intl/server";
import { clerkAppearance } from "./clerkAppearance";

/**
 * Clerk is mounted on the console, the login page and the public site (where
 * customers sign up to see product suggestions; docs/product-discovery.md).
 * The customer quote/tracking pages don't need it.
 */
export async function AuthProvider({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <ClerkProvider
      localization={locale === "en" ? enUS : frFR}
      signInUrl={`/${locale}/login`}
      appearance={clerkAppearance}
    >
      {children}
    </ClerkProvider>
  );
}
