"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { MAX_COMPARE, setCompared } from "@/lib/shelf";
import { useCompared } from "./SaveCompare";

/** A bar at the foot of the screen once something is picked to compare. */
export function CompareTray() {
  const t = useTranslations("store.compareTray");
  const list = useCompared();
  const pathname = usePathname();
  if (list.length === 0 || pathname === "/compare") return null;
  return (
    <div role="region" aria-label={t("label")} className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-[var(--hp-light)]/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-[var(--hp-gutter)] py-3">
        <p className="min-w-0 flex-1 text-sm text-ink">
          {t("count", { count: list.length, max: MAX_COMPARE })}
          {list.length < 2 ? <span className="text-ink-muted"> · {t("pickAnother")}</span> : null}
        </p>
        <button type="button" onClick={() => setCompared([])} className="rounded-[var(--radius-xs)] px-3 py-2 text-sm text-ink-muted hover:text-ink">
          {t("clear")}
        </button>
        <Link href="/compare" aria-disabled={list.length < 2} className="rounded-[var(--radius-s)] bg-ink px-4 py-2 text-sm font-medium text-ink-inverse aria-disabled:pointer-events-none aria-disabled:opacity-50">
          {t("open")}
        </Link>
      </div>
    </div>
  );
}
