"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { useTheme } from "@/context/ThemeContext";
import { rememberCurrency } from "@/lib/currencyChoice";
import type { CurrencyOptions } from "@/lib/displayCurrency";

const control =
  "h-9 cursor-pointer appearance-none rounded-[var(--hp-radius-chip)] bg-transparent px-2 text-sm font-medium text-inherit hover:bg-black/5 focus:outline-2 focus:outline-offset-2 focus:outline-focus-ring dark:hover:bg-white/10";

/** The site's language, kept on the page the shopper is on. */
export function LanguageSwitch({ className = "" }: { className?: string }) {
  const t = useTranslations("home.nav");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  return (
    <label className={`inline-flex items-center ${className}`}>
      <span className="sr-only">{t("language")}</span>
      <select
        value={locale}
        className={control}
        onChange={(e) => router.replace(`${pathname}${window.location.search}`, { locale: e.target.value as (typeof routing.locales)[number] })}
      >
        {routing.locales.map((l) => (
          <option key={l} value={l}>
            {l === "fr" ? "Français" : "English"}
          </option>
        ))}
      </select>
    </label>
  );
}

/**
 * The currency prices are also shown in, approximately (ADR-077). Only the
 * store's own and those staff keep a rate for are offered.
 */
export function CurrencyPicker({ options, current, className = "" }: { options: CurrencyOptions; current: string; className?: string }) {
  const t = useTranslations("home.nav");
  const router = useRouter();
  if (!options.rates.length) return null;
  return (
    <label className={`inline-flex items-center ${className}`}>
      <span className="sr-only">{t("currency")}</span>
      <select
        value={current}
        className={control}
        title={t("currencyHint", { currency: options.base })}
        onChange={(e) => {
          rememberCurrency(e.target.value);
          router.refresh();
        }}
      >
        <option value={options.base}>{options.base}</option>
        {options.rates.map((r) => (
          <option key={r.currency} value={r.currency}>
            ≈ {r.currency}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Light or dark, remembered on this device (context/ThemeContext). */
export function ThemeSwitch({ className = "", withLabel = false }: { className?: string; withLabel?: boolean }) {
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
