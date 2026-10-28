"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { detectCountry, localeForCountry, rememberCountry } from "@/lib/country";

type CountryState = {
  /** ISO code, null until known. */
  country: string | null;
  /** True while the first visit's location is being worked out. */
  detecting: boolean;
  /** The visitor corrects it by hand; the language follows. */
  setCountry: (code: string) => void;
};

const CountryContext = createContext<CountryState>({ country: null, detecting: false, setCountry: () => {} });

export const useCountry = () => useContext(CountryContext);

/**
 * The visitor's country for the public site. Known from the cookie, or on
 * the first visit asked of the browser (then the IP). The site's language is
 * the country's: there's no language switch.
 */
export function CountryProvider({ initialCountry, children }: { initialCountry: string | null; children: ReactNode }) {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [country, setState] = useState(initialCountry);
  const [detecting, setDetecting] = useState(initialCountry === null);
  const asked = useRef(false);

  const follow = useCallback(
    (code: string) => {
      const wanted = localeForCountry(code);
      if (wanted !== locale) router.replace(`${pathname}${window.location.search}`, { locale: wanted });
    },
    [locale, pathname, router],
  );

  // First visit: ask once.
  useEffect(() => {
    if (initialCountry || asked.current) return;
    asked.current = true;
    detectCountry().then((code) => {
      setDetecting(false);
      if (!code) return;
      rememberCountry(code);
      setState(code);
      follow(code);
    });
  }, [initialCountry, follow]);

  // A link in the other language: the country's language wins.
  useEffect(() => {
    if (initialCountry) follow(initialCountry);
  }, [initialCountry, follow]);

  const setCountry = useCallback(
    (code: string) => {
      rememberCountry(code);
      setState(code);
      follow(code);
    },
    [follow],
  );

  return <CountryContext.Provider value={{ country, detecting, setCountry }}>{children}</CountryContext.Provider>;
}
