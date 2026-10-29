import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

/** Nothing matches: say so, and offer the finder, which can source what the catalogue lacks. */
export async function EmptyListing({ query }: { query?: string }) {
  const t = await getTranslations("store.listing");
  return (
    <div className="rounded-[var(--radius-m)] border border-dashed border-line-strong px-6 py-12 text-center">
      <h2 className="rb-title">{query ? t("emptySearchTitle", { query }) : t("emptyTitle")}</h2>
      <p className="mx-auto mt-2 max-w-md text-ink-muted">{query ? t("emptySearchLead") : t("emptyLead")}</p>
      <Link href={query ? `/?need=${encodeURIComponent(query)}#quote` : "/#quote"} className="mt-6 inline-flex rounded-[var(--radius-s)] bg-ink px-5 py-3 text-sm font-medium text-ink-inverse hover:opacity-90">
        {t("askUs")}
      </Link>
    </div>
  );
}
