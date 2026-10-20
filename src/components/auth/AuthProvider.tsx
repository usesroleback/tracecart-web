import { ClerkProvider } from "@clerk/nextjs";
import { enUS, frFR } from "@clerk/localizations";
import { getLocale } from "next-intl/server";
import { clerkAppearance } from "./clerkAppearance";

/**
 * Clerk is only mounted on the console and the login page — the public site
 * and customer quote pages don't need its client script.
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
