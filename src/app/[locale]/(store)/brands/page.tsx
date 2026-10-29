import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { StoreShell } from "@/components/store/StoreShell";
import { STORE_CURRENCY, storeApi, storeCountry } from "@/lib/store";
import { alternates } from "@/lib/siteUrl";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "store.meta" });
  return { title: t("brandsTitle"), description: t("brandsDescription"), alternates: await alternates("/brands", locale) };
}

export default async function Brands({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations("store");
  const { data } = await storeApi(locale).GET("/catalog/brands", { params: { query: { country: await storeCountry(), currency: STORE_CURRENCY } } });
  return (
    <StoreShell>
      <h1 className="rb-headline text-[30px] sm:text-[40px]">{t("brands.title")}</h1>
      <p className="mt-2 text-ink-muted">{t("brands.lead")}</p>
      <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {(data?.brands ?? []).map((b) => (
          <li key={b.slug}>
            <Link href={`/b/${b.slug}`} className="flex h-full flex-col gap-2 rounded-[var(--radius-m)] border border-line bg-surface-raised p-4 hover:border-ink">
              <span className="font-medium text-ink">{b.name}</span>
              <span className="rb-mono-s text-ink-muted">{t("home.products", { count: b.count })}</span>
            </Link>
          </li>
        ))}
      </ul>
    </StoreShell>
  );
}
