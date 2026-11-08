"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { CategoryNode } from "@/lib/store";
import type { CurrencyOptions } from "@/lib/displayCurrency";
import { CountryPicker } from "../CountryPicker";
import { CurrencyPicker, LanguageSwitch, ThemeSwitch } from "./Preferences";
import { findHref } from "./DepartmentMenu";
import { LINKS } from "./links";

/**
 * The phone's menu: a drawer from the left with the departments (each opens
 * on its categories), the store's other pages, and the shopper's settings.
 */
export function MobileDrawer({ departments, currencies, currency }: { departments: CategoryNode[]; currencies: CurrencyOptions; currency: string }) {
  const t = useTranslations("home.nav");
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="grid size-10 place-items-center rounded-[var(--hp-radius-chip)] text-[var(--hp-text)] hover:bg-[var(--hp-light-sunken)] lg:hidden"
        aria-expanded={open}
        aria-controls="shop-drawer"
        aria-label={t("openMenu")}
        onClick={() => setOpen(true)}
      >
        <svg viewBox="0 0 20 20" aria-hidden className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M3 6h14M3 10h14M3 14h14" />
        </svg>
      </button>
      {open ? (
        <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-label={t("menu")}>
          <button type="button" aria-label={t("closeMenu")} className="absolute inset-0 bg-black/40" onClick={close} />
          <div id="shop-drawer" className="absolute inset-y-0 left-0 flex w-[min(88vw,380px)] flex-col overflow-y-auto bg-surface-raised text-ink shadow-[var(--shadow-2)]">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <p className="rb-title">{t("menu")}</p>
              <button type="button" onClick={close} aria-label={t("closeMenu")} className="grid size-10 place-items-center rounded-[var(--radius-s)] hover:bg-surface-sunken">
                <svg viewBox="0 0 20 20" aria-hidden className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M5 5l10 10M15 5 5 15" />
                </svg>
              </button>
            </div>

            <nav aria-label={t("departments")} className="border-b border-line py-2">
              <p className="rb-overline px-5 pb-1 pt-2 text-ink-muted">{t("departments")}</p>
              <ul>
                {departments.map((d) => {
                  const isOpen = expanded === d.slug;
                  return (
                    <li key={d.slug}>
                      <button
                        type="button"
                        aria-expanded={isOpen}
                        onClick={() => setExpanded(isOpen ? null : d.slug)}
                        className="flex w-full items-center justify-between px-5 py-3 text-left text-[15px] font-medium"
                      >
                        {d.name}
                        <svg viewBox="0 0 20 20" aria-hidden className={`size-4 transition-transform ${isOpen ? "rotate-90" : ""}`} fill="none" stroke="currentColor" strokeWidth="1.8">
                          <path d="m8 5 5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                      {isOpen ? (
                        <ul className="bg-surface pb-2">
                          <li>
                            <Link href={`/c/${d.slug}`} onClick={close} className="block px-8 py-2 text-sm font-medium underline">
                              {t("seeAllIn", { name: d.name })}
                            </Link>
                          </li>
                          {d.children.map((c) => (
                            <li key={c.slug}>
                              <Link href={`/c/${d.slug}/${c.slug}`} onClick={close} className="block px-8 py-2 text-sm text-ink-muted">
                                {c.name}
                              </Link>
                            </li>
                          ))}
                          {!d.children.length ? (
                            <li className="px-8 py-2 text-sm text-ink-muted">
                              {t("emptyDepartment", { name: d.name })}{" "}
                              <Link href={findHref(d.name)} onClick={close} className="font-medium text-ink underline">
                                {t("findForMe")}
                              </Link>
                            </li>
                          ) : null}
                        </ul>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </nav>

            <nav aria-label={t("label")} className="border-b border-line py-2">
              <ul>
                {LINKS.map((l) => (
                  <li key={l.key}>
                    <Link href={l.href} onClick={close} className="block px-5 py-3 text-[15px]">
                      {t(l.key)}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link href="/account/orders" onClick={close} className="block px-5 py-3 text-[15px]">
                    {t("orders")}
                  </Link>
                </li>
                <li>
                  <Link href="/account" onClick={close} className="block px-5 py-3 text-[15px]">
                    {t("account")}
                  </Link>
                </li>
              </ul>
            </nav>

            <div className="flex flex-col gap-1 px-4 py-4 text-ink-muted">
              <CountryPicker className="[&_option]:text-black" />
              <LanguageSwitch />
              <CurrencyPicker options={currencies} current={currency} />
              <ThemeSwitch withLabel className="flex h-9 items-center gap-2 px-2 text-sm font-medium" />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
