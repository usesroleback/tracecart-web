"use client";

import { useMemo, useSyncExternalStore } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useCountry } from "@/context/CountryContext";
import { COUNTRY_CODES, countryName } from "@/lib/country";

const noop = () => () => {};

/**
 * Where the visitor is: detected on the first visit, correctable here. The
 * site's language follows the country chosen, so this replaces a language switch.
 */
export function CountryPicker({ className = "" }: { className?: string }) {
  const t = useTranslations("site.country");
  const locale = useLocale();
  const { country, detecting, setCountry } = useCountry();
  // Country names come from the runtime's Intl data, which differs between
  // Node and browsers (names, hence their order). The server and the first
  // render in the browser show the code alone; the named list follows once
  // hydrated, so both sides agree.
  const hydrated = useSyncExternalStore(noop, () => true, () => false);
  const options = useMemo(
    () =>
      hydrated
        ? COUNTRY_CODES.map((code) => ({ code, name: countryName(code, locale) })).sort((a, b) => a.name.localeCompare(b.name, locale))
        : country
          ? [{ code: country, name: country }]
          : [],
    [hydrated, locale, country],
  );

  return (
    <label className={`relative inline-flex items-center ${className}`}>
      <span className="sr-only">{t("label")}</span>
      {country ? (
        // The country's flag, as an image: Windows doesn't draw flag emoji.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`https://flagcdn.com/${country.toLowerCase()}.svg`}
          alt=""
          width={20}
          height={15}
          className="pointer-events-none absolute left-2.5 h-[15px] w-5 rounded-[2px] object-cover shadow-[0_0_0_1px_rgba(0,0,0,0.12)]"
        />
      ) : (
        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none absolute left-2.5">
          <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z" />
          <circle cx="12" cy="9.5" r="2.5" />
        </svg>
      )}
      <select
        value={country ?? ""}
        onChange={(e) => e.target.value && setCountry(e.target.value)}
        className="h-9 max-w-[11rem] cursor-pointer appearance-none truncate rounded-[var(--hp-radius-chip)] bg-transparent py-2 pl-9 pr-3 text-sm font-medium text-inherit hover:bg-black/5 focus:outline-2 focus:outline-offset-2 focus:outline-focus-ring"
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
