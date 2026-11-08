import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { StoreShell } from "@/components/store/StoreShell";
import { CarryWithTracecart } from "@/components/carriers/CarrierPanel";
import { SERVER_API_URL } from "@/lib/apiBase";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "carriers.carry" });
  return { title: t("title"), description: t("lead") };
}

/** Carrying for Tracecart: what's asked, then the application once signed in (ADR-081). */
export default async function CarryPage() {
  const t = await getTranslations("carriers.carry");
  // Public, and current: staff can change what's required at any moment.
  const res = await fetch(`${SERVER_API_URL}/carriers/terms`, { cache: "no-store" }).catch(() => null);
  const terms = res?.ok ? ((await res.json()) as { requiredDocuments: string[] }) : null;
  return (
    <StoreShell>
      <h1 className="rb-headline text-[28px] sm:text-[36px]">{t("title")}</h1>
      <p className="mb-6 mt-2 max-w-2xl text-ink-muted">{t("lead")}</p>
      <CarryWithTracecart requiredDocuments={terms?.requiredDocuments ?? null} />
    </StoreShell>
  );
}
