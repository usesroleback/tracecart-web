// The visitor's country: from the browser's location (asked on the first
// visit), else from their IP (GET /geo/country). It sets the site's language,
// and is where the shop prices delivery to. Kept in a cookie for a year.

export const COUNTRY_COOKIE = "tc_country";
const LOCALE_COOKIE = "NEXT_LOCALE";
const YEAR = 60 * 60 * 24 * 365;

// Where TraceCart speaks French; English everywhere else. Mirrors the API's
// lib/countries.ts (the messages it sends follow the same rule).
const FRENCH = new Set([
  "BJ", "BF", "BI", "CM", "CF", "TD", "KM", "CG", "CD", "CI", "DJ", "GA", "GN", "MG", "ML", "MR", "MA", "NE", "RW", "SN", "SC", "TG", "TN", "DZ",
  "FR", "BE", "LU", "MC", "CH",
  "HT", "GP", "MQ", "GF", "RE", "YT", "PM", "BL", "MF",
  "PF", "NC", "WF", "LB",
]);

export type SiteLocale = "fr" | "en";

export const localeForCountry = (code: string): SiteLocale => (FRENCH.has(code.toUpperCase()) ? "fr" : "en");

/** ISO 3166-1 alpha-2 codes, for picking a country by hand. */
export const COUNTRY_CODES = (
  "AD AE AF AG AI AL AM AO AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ " +
  "DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GT GU GW GY HK HN HR HT HU ID IE IL IM IN IQ IR IS IT JE JM JO JP " +
  "KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ " +
  "OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TG TH TJ TK TL TM TN TO TR TT TV TW TZ " +
  "UA UG US UY UZ VA VC VE VG VI VN VU WF WS XK YE YT ZA ZM ZW"
).split(" ");

export const isCountryCode = (v: unknown): v is string => typeof v === "string" && /^[A-Z]{2}$/.test(v);

/** "NE" → "Niger" / "Niger", in the page's language. */
export function countryName(code: string, locale: string): string {
  try {
    return new Intl.DisplayNames([locale], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

export function readCountryCookie(): string | null {
  if (typeof document === "undefined") return null;
  const value = document.cookie.match(new RegExp(`(?:^|; )${COUNTRY_COOKIE}=([A-Z]{2})`))?.[1];
  return value ?? null;
}

/** Remembers the country, and the language that goes with it (next-intl reads NEXT_LOCALE). */
export function rememberCountry(code: string) {
  const attrs = `; path=/; max-age=${YEAR}; samesite=lax`;
  document.cookie = `${COUNTRY_COOKIE}=${code}${attrs}`;
  document.cookie = `${LOCALE_COOKIE}=${localeForCountry(code)}${attrs}`;
}

/** The browser's position, if the visitor allows it, as a country code. */
async function fromBrowser(): Promise<string | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) return null;
  const position = await new Promise<GeolocationPosition | null>((resolve) =>
    navigator.geolocation.getCurrentPosition(resolve, () => resolve(null), { timeout: 15000, maximumAge: 24 * 3600 * 1000, enableHighAccuracy: false }),
  );
  if (!position) return null;
  // Coordinates to a country: BigDataCloud's free client-side lookup (no key; meant to be called from the browser).
  const { latitude, longitude } = position.coords;
  try {
    const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`);
    if (!res.ok) return null;
    const code = ((await res.json()) as { countryCode?: string }).countryCode?.toUpperCase();
    return isCountryCode(code) ? code : null;
  } catch {
    return null;
  }
}

/** From the visitor's IP, through the API. */
async function fromIp(): Promise<string | null> {
  try {
    const res = await fetch("/api/tracecart/geo/country", { cache: "no-store" });
    if (!res.ok) return null;
    const code = ((await res.json()) as { countryCode?: string | null }).countryCode;
    return isCountryCode(code) ? code : null;
  } catch {
    return null;
  }
}

/** Asks the browser first; refused, unavailable or unreadable, the IP decides. */
export async function detectCountry(): Promise<string | null> {
  return (await fromBrowser()) ?? (await fromIp());
}
