"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import type { CategoryNode } from "@/lib/store";
import type { CurrencyOptions } from "@/lib/displayCurrency";
import { CartLink } from "@/components/store/CartLink";
import { SearchBox } from "@/components/store/SearchBox";
import { CountryPicker } from "../CountryPicker";
import { CurrencyPicker, LanguageSwitch, ThemeSwitch } from "./Preferences";
import { DepartmentMenu } from "./DepartmentMenu";
import { MobileDrawer } from "./MobileDrawer";
import { findHref, LINKS } from "./links";

const quiet = "rounded-[var(--hp-radius-chip)] text-[var(--hp-text-muted)] hover:bg-[var(--hp-light-sunken)] hover:text-[var(--hp-text)]";

/**
 * The shopping header on every public page (PLAN §14 G1). Desktop: the logo,
 * a wide search with departments and photo search, the shopper's settings,
 * account, orders and cart; below, "All departments" and a bar of them.
 * Phone: the menu button, logo, account and cart, then the search.
 */
export function ShopHeader({ departments, currencies, currency, query }: { departments: CategoryNode[]; currencies: CurrencyOptions; currency: string; query?: string }) {
  const t = useTranslations("home.nav");
  const pathname = usePathname();
  const activeDepartment = pathname.startsWith("/c/") ? pathname.split("/")[2] : null;

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-[var(--hp-light)]/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1400px] items-center gap-2 px-[var(--hp-gutter)] py-2 sm:gap-4">
        <MobileDrawer departments={departments} currencies={currencies} currency={currency} />
        <Link href="/" aria-label="Tracecart" className="flex shrink-0 items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/logo/tracecart-lockup.svg" alt="" width={152} height={21} className="block h-[20px] w-auto dark:hidden" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/logo/tracecart-lockup-white.svg" alt="" width={152} height={21} className="hidden h-[20px] w-auto dark:block" />
        </Link>

        {/* Where it's delivered, beside the logo: it decides the prices shown. */}
        <span className="hidden shrink-0 lg:block">
          <CountryPicker className="text-[var(--hp-text-muted)] hover:text-[var(--hp-text)]" />
        </span>

        <div className="hidden min-w-0 flex-1 md:block">
          <SearchBox initialQuery={query} departments={departments} />
        </div>

        <div className="ml-auto flex items-center gap-1">
          <ThemeSwitch className={`hidden size-10 place-items-center sm:grid ${quiet}`} />
          <Link href="/account/orders" className={`hidden px-3 py-2 text-sm font-medium lg:block ${quiet}`}>
            {t("orders")}
          </Link>
          <Link href="/account" className={`grid size-10 place-items-center lg:flex lg:w-auto lg:px-3 lg:text-sm lg:font-medium ${quiet}`} aria-label={t("account")}>
            <svg viewBox="0 0 20 20" aria-hidden className="size-5 lg:hidden" fill="none" stroke="currentColor" strokeWidth="1.7">
              <circle cx="10" cy="7" r="3.2" />
              <path d="M3.5 17c.8-3.2 3.4-5 6.5-5s5.7 1.8 6.5 5" strokeLinecap="round" />
            </svg>
            <span className="hidden lg:inline">{t("account")}</span>
          </Link>
          <CartLink className={`px-2 py-2 ${quiet}`} />
        </div>
      </div>

      {/* Phones and small tablets: the search on its own row, photo search included. */}
      <div className="px-[var(--hp-gutter)] pb-2 md:hidden">
        <SearchBox initialQuery={query} />
      </div>

      <nav aria-label={t("departments")} className="hidden border-t border-line lg:block">
        <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-[var(--hp-gutter)] py-1.5">
          <DepartmentMenu departments={departments} />
          <ul className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto text-sm [scrollbar-width:none]">
            {departments.map((d) => (
              <li key={d.slug} className="shrink-0">
                <Link
                  href={`/c/${d.slug}`}
                  aria-current={activeDepartment === d.slug ? "page" : undefined}
                  className={`block rounded-[var(--hp-radius-chip)] px-3 py-2 ${activeDepartment === d.slug ? "bg-[var(--hp-light-sunken)] font-medium text-[var(--hp-text)]" : "text-[var(--hp-text-muted)] hover:text-[var(--hp-text)]"}`}
                >
                  {d.name}
                </Link>
              </li>
            ))}
          </ul>
          <ul className="flex shrink-0 items-center gap-1 border-l border-line pl-3 text-sm">
            {LINKS.filter((l) => l.key === "deals").map((l) => (
              <li key={l.key}>
                <Link
                  href={l.href}
                  aria-current={pathname === l.href ? "page" : undefined}
                  className={`block rounded-[var(--hp-radius-chip)] px-3 py-2 ${pathname === l.href ? "font-medium text-[var(--hp-text)]" : "text-[var(--hp-text-muted)] hover:text-[var(--hp-text)]"}`}
                >
                  {t(l.key)}
                </Link>
              </li>
            ))}
            <li>
              <Link href={findHref()} className="block rounded-[var(--hp-radius-chip)] px-3 py-2 font-medium text-[var(--hp-text)] underline-offset-4 hover:underline">
                {t("findForMe")}
              </Link>
            </li>
            <li className="text-[var(--hp-text-muted)]">
              <LanguageSwitch />
            </li>
            <li className="text-[var(--hp-text-muted)]">
              <CurrencyPicker options={currencies} current={currency} />
            </li>
          </ul>
        </div>
      </nav>
    </header>
  );
}
