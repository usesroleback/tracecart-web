import type { ReactNode } from "react";
import { SiteShell } from "@/components/site/home/SiteShell";

/** A store page: the shopping header (with the search) and footer around the page. */
export async function StoreShell({ children, query }: { children: ReactNode; query?: string }) {
  return (
    <SiteShell query={query}>
      <main className="mx-auto min-h-[60vh] max-w-[1400px] px-[var(--hp-gutter)] pb-16 pt-6">{children}</main>
    </SiteShell>
  );
}
