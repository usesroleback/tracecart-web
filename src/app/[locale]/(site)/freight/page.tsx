import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { StoreShell } from "@/components/store/StoreShell";
import { Freight } from "@/components/services/Freight";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "services.freight" });
  return { title: t("title"), description: t("lead") };
}

/** Freight: goods the customer already has, estimated from photos, then quoted by an agent (docs ADR-036). */
export default async function FreightPage() {
  const t = await getTranslations("services.freight");
  return (
    <StoreShell search={false}>
      <h1 className="rb-headline text-[28px] sm:text-[36px]">{t("title")}</h1>
      <p className="mb-6 mt-2 max-w-2xl text-ink-muted">{t("lead")}</p>
      <Freight />
    </StoreShell>
  );
}
