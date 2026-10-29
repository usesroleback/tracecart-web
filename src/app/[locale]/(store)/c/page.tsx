import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { StoreShell } from "@/components/store/StoreShell";
import { STORE_CURRENCY, storeApi, storeCountry, type CategoryNode } from "@/lib/store";
import { alternates } from "@/lib/siteUrl";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "store.meta" });
  return { title: t("catalogueTitle"), description: t("catalogueDescription"), alternates: await alternates("/c", locale) };
}

/** Every category with products, two levels shown, deeper ones on their pages. */
export default async function Catalogue({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations("store");
  const { data } = await storeApi(locale).GET("/catalog/categories", { params: { query: { country: await storeCountry(), currency: STORE_CURRENCY } } });
  const top: CategoryNode[] = data?.categories ?? [];
  return (
    <StoreShell>
      <h1 className="rb-headline text-[30px] sm:text-[40px]">{t("catalogue.title")}</h1>
      <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {top.map((c) => (
          <li key={c.slug} className="rounded-[var(--radius-m)] border border-line bg-surface-raised p-5">
            <h2 className="rb-title">
              <Link href={`/c/${c.slug}`} className="hover:underline">
                {c.name}
              </Link>
              <span className="rb-mono-s ml-2 text-ink-muted">{c.count}</span>
            </h2>
            <ul className="mt-3 space-y-1.5">
              {c.children
                .filter((k) => k.count > 0)
                .map((k) => (
                  <li key={k.slug}>
                    <Link href={`/c/${c.slug}/${k.slug}`} className="flex justify-between gap-3 text-sm text-ink hover:underline">
                      <span>{k.name}</span>
                      <span className="rb-mono-s text-ink-muted">{k.count}</span>
                    </Link>
                  </li>
                ))}
            </ul>
          </li>
        ))}
      </ul>
    </StoreShell>
  );
}
