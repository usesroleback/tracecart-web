import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { StoreShell } from "@/components/store/StoreShell";
import { ApplyForCompany } from "@/components/b2b/Company";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "b2b" });
  return { title: t("title"), description: t("lead") };
}

export default async function BusinessPage() {
  const t = await getTranslations("b2b");
  return (
    <StoreShell search={false}>
      <h1 className="rb-headline text-[28px] sm:text-[36px]">{t("title")}</h1>
      <p className="mb-6 mt-2 max-w-2xl text-ink-muted">{t("lead")}</p>
      <ApplyForCompany />
    </StoreShell>
  );
}
