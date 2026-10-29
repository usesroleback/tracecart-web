"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { PillLink } from "./primitives";
import { CountryPicker } from "../CountryPicker";
import { useTheme } from "@/context/ThemeContext";

/** Light or dark, remembered on this device (context/ThemeContext). */
function ThemeSwitch({ className = "", withLabel = false }: { className?: string; withLabel?: boolean }) {
  const { theme, toggleTheme } = useTheme();
  const t = useTranslations("common.theme");
  const label = theme === "dark" ? t("toLight") : t("toDark");
  return (
    <button type="button" onClick={toggleTheme} aria-label={withLabel ? undefined : label} title={label} className={className}>
      {/* The icon follows the .dark class, so the server render and the first paint agree. */}
      <svg viewBox="0 0 20 20" aria-hidden className="hidden size-5 dark:block">
        <circle cx="10" cy="10" r="3.6" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.3 4.3l1.4 1.4M14.3 14.3l1.4 1.4M4.3 15.7l1.4-1.4M14.3 5.7l1.4-1.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      <svg viewBox="0 0 20 20" aria-hidden className="size-5 dark:hidden">
        <path d="M16.5 12.2A6.8 6.8 0 0 1 7.8 3.5a6.8 6.8 0 1 0 8.7 8.7Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
      {withLabel && <span>{label}</span>}
    </button>
  );
}

const LINKS = [
  { key: "home", href: "/" },
  { key: "catalogue", href: "/c" },
  { key: "brands", href: "/brands" },
  { key: "ship", href: "/ship" },
  { key: "about", href: "/about" },
] as const;

function NavLink({
  href,
  className,
  children,
  onClick,
  "aria-current": current,
}: {
  href: string;
  className: string;
  children: React.ReactNode;
  onClick?: () => void;
  "aria-current"?: "page";
}) {
  if (href.startsWith("/")) {
    return (
      <Link href={href} className={className} onClick={onClick} aria-current={current}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} className={className} onClick={onClick} aria-current={current}>
      {children}
    </a>
  );
}

export function HomeNav() {
  const t = useTranslations("home.nav");
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  // The finder (#quote) is on the store's home and on /about; from elsewhere the link goes home.
  const onHome = pathname === "/" || pathname === "/about";
  const to = (href: string) => (href.startsWith("#") && !onHome ? `/${href}` : href);
  const isActive = (key: (typeof LINKS)[number]["key"]) => {
    if (key === "home") return pathname === "/";
    if (key === "catalogue") return pathname === "/c" || pathname.startsWith("/c/") || pathname.startsWith("/p/") || pathname === "/s";
    if (key === "brands") return pathname === "/brands" || pathname.startsWith("/b/");
    return pathname.startsWith(`/${key}`);
  };

  // Escape closes the mobile menu.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-50 px-[var(--hp-gutter)] pt-3">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between gap-4 rounded-[var(--hp-radius-control)] bg-[var(--hp-light)]/85 pl-5 pr-2 backdrop-blur-md">
        <Link href="/" aria-label="Tracecart" className="flex items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/logo/tracecart-lockup.svg" alt="" width={152} height={21} className="block h-[21px] w-auto dark:hidden" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/logo/tracecart-lockup-white.svg" alt="" width={152} height={21} className="hidden h-[21px] w-auto dark:block" />
        </Link>

        <nav aria-label={t("label")} className="hidden lg:block">
          <ul className="flex items-center gap-1 rounded-[var(--hp-radius-control)] bg-[var(--hp-light-sunken)] p-1 text-sm font-medium">
            {LINKS.map((l) => (
              <li key={l.key}>
                <NavLink
                  href={to(l.href)}
                  aria-current={isActive(l.key) ? "page" : undefined}
                  className={`block rounded-[var(--hp-radius-chip)] px-4 py-2 ${
                    isActive(l.key) ? "bg-[var(--hp-light-raised)] text-[var(--hp-text)] shadow-sm" : "text-[var(--hp-text-muted)] hover:text-[var(--hp-text)]"
                  }`}
                >
                  {t(l.key)}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <CountryPicker className="hidden text-[var(--hp-text-muted)] hover:text-[var(--hp-text)] sm:inline-flex" />
          <ThemeSwitch className="grid size-10 place-items-center rounded-[var(--hp-radius-chip)] text-[var(--hp-text-muted)] hover:bg-[var(--hp-light-sunken)] hover:text-[var(--hp-text)]" />
          <Link href="/account" className="hidden rounded-[var(--hp-radius-chip)] px-3 py-2 text-sm font-medium text-[var(--hp-text-muted)] hover:text-[var(--hp-text)] md:block">
            {t("account")}
          </Link>
          {/* A wrapper hides it on phones: the pill's own inline-flex would beat "hidden". The menu has the same link. */}
          <span className="hidden md:block">
            <PillLink href={to("#quote")}>{t("cta")}</PillLink>
          </span>
          <button
            type="button"
            className="grid size-11 place-items-center rounded-[var(--hp-radius-control)] bg-[var(--hp-dark)] text-[var(--hp-on-dark)] lg:hidden"
            aria-expanded={menuOpen}
            aria-controls="hp-menu"
            aria-label={menuOpen ? t("closeMenu") : t("openMenu")}
            onClick={() => setMenuOpen((o) => !o)}
          >
            <svg viewBox="0 0 20 20" aria-hidden className="size-5">
              {menuOpen ? (
                <path d="M5 5l10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              ) : (
                <path d="M3 7h14M3 13h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {menuOpen && (
        <div id="hp-menu" className="fixed inset-x-0 bottom-0 top-[84px] z-40 overflow-y-auto bg-[var(--hp-dark)] px-6 pb-10 pt-6 text-[var(--hp-on-dark)] lg:hidden">
          <nav aria-label={t("label")}>
            <ul className="space-y-1 text-3xl font-semibold tracking-tight">
              {LINKS.map((l) => (
                <li key={l.key}>
                  <NavLink href={to(l.href)} onClick={() => setMenuOpen(false)} className="block py-2">
                    {t(l.key)}
                  </NavLink>
                </li>
              ))}
              <li>
                <Link href="/account" onClick={() => setMenuOpen(false)} className="block py-2">
                  {t("account")}
                </Link>
              </li>
            </ul>
          </nav>
          {/* Any link in here closes the menu, including the CTA. */}
          <div className="mt-8 flex flex-col gap-3" onClick={() => setMenuOpen(false)}>
            <PillLink href={to("#quote")} tone="primary" block>
              {t("cta")}
            </PillLink>
            <CountryPicker className="py-2 text-[var(--hp-on-dark-muted)] [&_option]:text-black" />
          </div>
          {/* Outside the closing wrapper: switching the theme keeps the menu open. */}
          <ThemeSwitch withLabel className="mt-3 flex items-center gap-2 py-2 text-[var(--hp-on-dark-muted)]" />
        </div>
      )}
    </header>
  );
}
