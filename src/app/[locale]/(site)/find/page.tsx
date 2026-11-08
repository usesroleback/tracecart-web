import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { StoreShell } from "@/components/store/StoreShell";
import { FindForMe } from "@/components/services/FindForMe";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ search?: string; q?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "services.find" });
  return { title: t("title"), robots: { index: false, follow: true } };
}

/** "Find it for me": what the catalogue doesn't have, found and quoted by an agent (docs ADR-038). */
export default async function FindPage({ searchParams }: Props) {
  const { search, q } = await searchParams;
  const t = await getTranslations("services.find");
  const searchId = typeof search === "string" && /^[0-9a-f-]{36}$/i.test(search) ? search : undefined;
  return (
    <StoreShell>
      <h1 className="rb-headline text-[28px] sm:text-[36px]">{t("title")}</h1>
      <p className="mb-6 mt-2 max-w-2xl text-ink-muted">{t("lead")}</p>
      <FindForMe searchId={searchId} initialWhat={typeof q === "string" ? q.slice(0, 500) : undefined} />
    </StoreShell>
  );
}
