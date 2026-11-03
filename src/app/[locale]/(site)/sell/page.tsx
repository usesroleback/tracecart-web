import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { StoreShell } from "@/components/store/StoreShell";
import { SellOnTracecart } from "@/components/sellers/SellOnTracecart";
import { SERVER_API_URL } from "@/lib/apiBase";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "sellers.sell" });
  return { title: t("title"), description: t("lead") };
}

/** Selling on Tracecart: the terms for anyone, then the application once signed in (ADR-050). */
export default async function SellPage() {
  const t = await getTranslations("sellers.sell");
  // Public, and current: staff can change them at any moment.
  const res = await fetch(`${SERVER_API_URL}/sellers/terms`, { cache: "no-store" }).catch(() => null);
  const terms = res?.ok ? ((await res.json()) as { commissionBps: number; payoutHoldDays: number; requiredDocuments: string[] }) : null;
  return (
    <StoreShell search={false}>
      <h1 className="rb-headline text-[28px] sm:text-[36px]">{t("title")}</h1>
      <p className="mb-6 mt-2 max-w-2xl text-ink-muted">{t("lead")}</p>
      <SellOnTracecart terms={terms} />
    </StoreShell>
  );
}
