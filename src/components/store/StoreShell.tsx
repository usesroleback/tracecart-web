import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SiteShell } from "@/components/site/home/SiteShell";
import { SearchBox } from "./SearchBox";

/** A store page: the site's nav and footer, with the search bar under the nav. */
export async function StoreShell({ children, query, search = true }: { children: ReactNode; query?: string; search?: boolean }) {
  const t = await getTranslations("store.nav");
  return (
    <SiteShell>
      {search ? (
        <div className="mx-auto mt-3 flex max-w-[1400px] flex-col gap-2 px-[var(--hp-gutter)] sm:flex-row sm:items-center sm:gap-4">
          <div className="flex-1">
            <SearchBox initialQuery={query} />
          </div>
          <nav aria-label={t("categories")} className="flex gap-4 text-sm font-medium text-ink-muted">
            <Link href="/c" className="hover:text-ink">
              {t("categories")}
            </Link>
            <Link href="/brands" className="hover:text-ink">
              {t("brands")}
            </Link>
            <Link href="/deals" className="hover:text-ink">
              {t("deals")}
            </Link>
          </nav>
        </div>
      ) : null}
      <main className="mx-auto min-h-[60vh] max-w-[1400px] px-[var(--hp-gutter)] pb-16 pt-6">{children}</main>
    </SiteShell>
  );
}
