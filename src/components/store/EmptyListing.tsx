import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

/** Nothing matches: say so, and offer the AI search and "Find it for me", which sources what the catalogue lacks. */
/** Nothing to list: filters too narrow, no match, or a department nothing is listed in yet (ADR-077). */
export async function EmptyListing({ query, department, below }: { query?: string; department?: string; below?: { name: string; href: string }[] }) {
  const t = await getTranslations("store.listing");
  return (
    <div className="rounded-[var(--radius-m)] border border-dashed border-line-strong px-6 py-12 text-center">
      <h2 className="rb-title">{query ? t("emptySearchTitle", { query }) : department ? t("emptyDepartmentTitle", { name: department }) : t("emptyTitle")}</h2>
      <p className="mx-auto mt-2 max-w-md text-ink-muted">{query ? t("emptySearchLead") : department ? t("emptyDepartmentLead") : t("emptyLead")}</p>
      {below?.length ? (
        <ul className="mx-auto mt-5 flex max-w-2xl flex-wrap justify-center gap-2">
          {below.map((b) => (
            <li key={b.href}>
              <Link href={b.href} className="inline-flex rounded-[var(--radius-xs)] border border-line bg-surface-raised px-3 py-1.5 text-sm text-ink hover:border-ink">
                {b.name}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link href={query ? `/s/ai?q=${encodeURIComponent(query)}` : "/s/ai"} className="inline-flex rounded-[var(--radius-s)] border border-ink px-5 py-3 text-sm font-medium text-ink hover:bg-ink hover:text-ink-inverse">
          {t("searchWithPhoto")}
        </Link>
        <Link href={query ? `/find?q=${encodeURIComponent(query)}` : department ? `/find?q=${encodeURIComponent(department)}` : "/find"} className="inline-flex rounded-[var(--radius-s)] bg-ink px-5 py-3 text-sm font-medium text-ink-inverse hover:opacity-90">
          {t("askUs")}
        </Link>
      </div>
    </div>
  );
}
