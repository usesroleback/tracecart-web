"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useCountry } from "@/context/CountryContext";
import { COUNTRY_CODES, countryName } from "@/lib/country";

/**
 * Where the visitor is: detected on the first visit, correctable here. The
 * site's language follows the country chosen, so this replaces a language switch.
 */
export function CountryPicker({ className = "" }: { className?: string }) {
  const t = useTranslations("site.country");
  const locale = useLocale();
  const { country, detecting, setCountry } = useCountry();
  const options = useMemo(
    () => COUNTRY_CODES.map((code) => ({ code, name: countryName(code, locale) })).sort((a, b) => a.name.localeCompare(b.name, locale)),
    [locale],
  );

  return (
    <label className={`relative inline-flex items-center ${className}`}>
      <span className="sr-only">{t("label")}</span>
      <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none absolute left-2.5">
        <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z" />
        <circle cx="12" cy="9.5" r="2.5" />
      </svg>
      <select
        value={country ?? ""}
        onChange={(e) => e.target.value && setCountry(e.target.value)}
        className="h-9 max-w-[11rem] cursor-pointer appearance-none truncate rounded-[var(--hp-radius-chip)] bg-transparent py-2 pl-8 pr-3 text-sm font-medium text-inherit hover:bg-black/5 focus:outline-2 focus:outline-offset-2 focus:outline-focus-ring"
      >
        {!country && <option value="">{detecting ? t("detecting") : t("choose")}</option>}
        {options.map((o) => (
          <option key={o.code} value={o.code}>
            {o.name}
          </option>
        ))}
      </select>
    </label>
  );
}
