import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { StoreShell } from "@/components/store/StoreShell";
import { AiSearch } from "@/components/store/AiSearch";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ q?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ai" });
  return { title: t("title"), robots: { index: false, follow: true } };
}

/** Search by words, a photo or a video (docs ADR-039). */
export default async function AiSearchPage({ searchParams }: Props) {
  const { q } = await searchParams;
  const t = await getTranslations("ai");
  return (
    <StoreShell>
      <h1 className="rb-headline text-[28px] sm:text-[36px]">{t("title")}</h1>
      <p className="mt-2 max-w-2xl text-ink-muted">{t("lead")}</p>
      <div className="mt-6">
        <AiSearch initialQuery={typeof q === "string" ? q.slice(0, 300) : ""} />
      </div>
    </StoreShell>
  );
}
