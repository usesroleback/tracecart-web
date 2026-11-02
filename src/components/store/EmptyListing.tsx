import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

/** Nothing matches: say so, and offer the AI search and "Find it for me", which sources what the catalogue lacks. */
export async function EmptyListing({ query }: { query?: string }) {
  const t = await getTranslations("store.listing");
  return (
    <div className="rounded-[var(--radius-m)] border border-dashed border-line-strong px-6 py-12 text-center">
      <h2 className="rb-title">{query ? t("emptySearchTitle", { query }) : t("emptyTitle")}</h2>
      <p className="mx-auto mt-2 max-w-md text-ink-muted">{query ? t("emptySearchLead") : t("emptyLead")}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link href={query ? `/s/ai?q=${encodeURIComponent(query)}` : "/s/ai"} className="inline-flex rounded-[var(--radius-s)] border border-ink px-5 py-3 text-sm font-medium text-ink hover:bg-ink hover:text-ink-inverse">
          {t("searchWithPhoto")}
        </Link>
        <Link href={query ? `/find?q=${encodeURIComponent(query)}` : "/find"} className="inline-flex rounded-[var(--radius-s)] bg-ink px-5 py-3 text-sm font-medium text-ink-inverse hover:opacity-90">
          {t("askUs")}
        </Link>
      </div>
    </div>
  );
}
