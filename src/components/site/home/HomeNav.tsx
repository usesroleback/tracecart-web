"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { PillLink } from "./primitives";

const LINKS = [
  { key: "home", href: "#top" },
  { key: "services", href: "#services" },
  { key: "process", href: "#process" },
  { key: "ship", href: "/ship" },
] as const;

const MORE = [
  { key: "results", href: "#results" },
  { key: "work", href: "#work" },
  { key: "insights", href: "#insights" },
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
  const locale = useLocale();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLLIElement>(null);
  const other = locale === "fr" ? "en" : "fr";
  // Section anchors live on the homepage; from /ship or /account they go back to it.
  const onHome = pathname === "/";
  const to = (href: string) => (href.startsWith("#") && !onHome ? `/${href}` : href);
  const isActive = (key: string) => (key === "home" ? onHome : key === "ship" ? pathname.startsWith("/ship") : false);

  // Close the dropdown on outside click or Escape; Escape closes the mobile menu too.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMoreOpen(false);
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-50 px-[var(--hp-gutter)] pt-3">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between gap-4 rounded-full bg-[var(--hp-light)]/85 pl-5 pr-2 backdrop-blur-md">
        <Link href="/" aria-label="TraceCart" className="flex items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/logo/tracecart-lockup.svg" alt="" width={152} height={21} className="block h-[21px] w-auto dark:hidden" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/logo/tracecart-lockup-white.svg" alt="" width={152} height={21} className="hidden h-[21px] w-auto dark:block" />
        </Link>

        <nav aria-label={t("label")} className="hidden lg:block">
          <ul className="flex items-center gap-1 rounded-full bg-[var(--hp-light-sunken)] p-1 text-sm font-medium">
            {LINKS.map((l) => (
              <li key={l.key}>
                <NavLink
                  href={to(l.href)}
                  aria-current={isActive(l.key) ? "page" : undefined}
                  className={`block rounded-full px-4 py-2 ${
                    isActive(l.key) ? "bg-[var(--hp-light-raised)] text-[var(--hp-text)] shadow-sm" : "text-[var(--hp-text-muted)] hover:text-[var(--hp-text)]"
                  }`}
                >
                  {t(l.key)}
                </NavLink>
              </li>
            ))}
            <li className="relative" ref={moreRef}>
              <button
                type="button"
                aria-expanded={moreOpen}
                aria-controls="hp-more"
                onClick={() => setMoreOpen((o) => !o)}
                className="flex items-center gap-1 rounded-full px-4 py-2 text-[var(--hp-text-muted)] hover:text-[var(--hp-text)]"
              >
                {t("more")}
                <svg viewBox="0 0 12 12" aria-hidden className={`size-3 transition-transform ${moreOpen ? "rotate-180" : ""}`}>
                  <path d="M3 4.5 6 7.5l3-3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              {moreOpen && (
                <ul id="hp-more" className="absolute left-0 top-full mt-2 w-48 rounded-2xl bg-[var(--hp-dark)] p-2 text-[var(--hp-on-dark)] shadow-[var(--hp-shadow)]">
                  {MORE.map((l) => (
                    <li key={l.key}>
                      <NavLink href={to(l.href)} onClick={() => setMoreOpen(false)} className="block rounded-xl px-3 py-2 hover:bg-white/10">
                        {t(l.key)}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <Link href={pathname} locale={other} className="hidden rounded-full px-3 py-2 text-sm font-medium text-[var(--hp-text-muted)] hover:text-[var(--hp-text)] sm:block" hrefLang={other}>
            {t("language")}
          </Link>
          <Link href="/account" className="hidden rounded-full px-3 py-2 text-sm font-medium text-[var(--hp-text-muted)] hover:text-[var(--hp-text)] md:block">
            {t("account")}
          </Link>
          {/* A wrapper hides it on phones: the pill's own inline-flex would beat "hidden". The menu has the same link. */}
          <span className="hidden md:block">
            <PillLink href={to("#quote")}>{t("cta")}</PillLink>
          </span>
          <button
            type="button"
            className="grid size-11 place-items-center rounded-full bg-[var(--hp-dark)] text-[var(--hp-on-dark)] lg:hidden"
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
              {[...LINKS, ...MORE].map((l) => (
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
            <Link href={pathname} locale={other} hrefLang={other} className="py-2 text-sm text-[var(--hp-on-dark-muted)]">
              {t("language")}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
