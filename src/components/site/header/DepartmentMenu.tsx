"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { CategoryNode } from "@/lib/store";

/** "Find it for me", with a department's name already typed. */
export const findHref = (need?: string) => (need ? `/find?q=${encodeURIComponent(need)}` : "/find");

/**
 * "All departments": a panel with the department list on the left and the
 * chosen department's categories on the right (ADR-077). Built from the
 * category tree the API returns, so a new category shows without code.
 */
export function DepartmentMenu({ departments }: { departments: CategoryNode[] }) {
  const t = useTranslations("home.nav");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(departments[0]?.slug ?? "");
  const root = useRef<HTMLDivElement>(null);
  const current = departments.find((d) => d.slug === active) ?? departments[0];

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onClick = (e: MouseEvent) => root.current && !root.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  if (!departments.length) return null;
  const close = () => setOpen(false);

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="department-panel"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-10 items-center gap-2 rounded-[var(--hp-radius-chip)] bg-[var(--hp-dark)] px-4 text-sm font-medium text-[var(--hp-on-dark)]"
      >
        <svg viewBox="0 0 20 20" aria-hidden className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M3 6h14M3 10h14M3 14h14" />
        </svg>
        {t("allDepartments")}
      </button>
      {open && current ? (
        <div
          id="department-panel"
          className="absolute left-0 top-12 z-50 grid w-[min(92vw,960px)] grid-cols-[240px_1fr] overflow-hidden rounded-[var(--radius-m)] border border-line bg-surface-raised text-ink shadow-[var(--shadow-2)]"
        >
          <ul className="max-h-[70vh] overflow-y-auto border-r border-line bg-surface py-2" aria-label={t("departments")}>
            {departments.map((d) => (
              <li key={d.slug}>
                <Link
                  href={`/c/${d.slug}`}
                  onClick={close}
                  onMouseEnter={() => setActive(d.slug)}
                  onFocus={() => setActive(d.slug)}
                  aria-current={d.slug === current.slug ? "true" : undefined}
                  className={`flex items-center justify-between gap-2 px-4 py-2 text-sm ${d.slug === current.slug ? "bg-surface-raised font-medium" : "text-ink-muted hover:text-ink"}`}
                >
                  {d.name}
                  <svg viewBox="0 0 20 20" aria-hidden className="size-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="m8 5 5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
              </li>
            ))}
          </ul>
          <div className="max-h-[70vh] overflow-y-auto p-6">
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
              <p className="rb-title-l">{current.name}</p>
              <Link href={`/c/${current.slug}`} onClick={close} className="text-sm font-medium underline">
                {t("seeAllIn", { name: current.name })}
              </Link>
            </div>
            {current.children.length ? (
              <ul className="grid grid-cols-2 gap-x-8 gap-y-5 lg:grid-cols-3">
                {current.children.map((c) => (
                  <li key={c.slug}>
                    <Link href={`/c/${current.slug}/${c.slug}`} onClick={close} className="text-sm font-medium hover:underline">
                      {c.name}
                    </Link>
                    {c.children.length ? (
                      <ul className="mt-1.5 space-y-1">
                        {c.children.slice(0, 6).map((g) => (
                          <li key={g.slug}>
                            <Link href={`/c/${current.slug}/${c.slug}/${g.slug}`} onClick={close} className="text-sm text-ink-muted hover:text-ink">
                              {g.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="max-w-md text-sm">
                <p className="text-ink-muted">{t("emptyDepartment", { name: current.name })}</p>
                <Link href={findHref(current.name)} onClick={close} className="mt-3 inline-block font-medium underline">
                  {t("findForMe")}
                </Link>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
