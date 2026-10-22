import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SiteShell } from "@/components/site/home/SiteShell";
import { AccountArea } from "./AccountArea";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("account");
  return { title: t("meta.title") };
}

/** The customer's own area: sign up / in, contact details, and their requests. */
export default function AccountPage() {
  return (
    <SiteShell>
      <main className="mx-auto min-h-[60vh] max-w-4xl px-5 py-10 sm:px-8 sm:py-14">
        <AccountArea />
      </main>
    </SiteShell>
  );
}
