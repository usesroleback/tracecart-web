// Two short lists kept in first-party cookies, never on the server (ADR-078):
// the products last viewed (for "Recently viewed") and those picked to compare.
// Slugs only, joined by dots (a slug never has one).

export const SEEN_COOKIE = "tc_seen";
export const COMPARE_COOKIE = "tc_compare";
export const MAX_SEEN = 12;
export const MAX_COMPARE = 4;
/** Fired on window when either list changes, so every button and tray follows. */
export const SHELF_EVENT = "tc:shelf";

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_AGE = 60 * 60 * 24 * 90;

export function parseSlugs(raw: string | undefined | null, max: number): string[] {
  if (!raw) return [];
  let text = raw;
  try {
    text = decodeURIComponent(raw);
  } catch {
    return [];
  }
  return [...new Set(text.split(/[.,]/).filter((s) => s.length <= 160 && SLUG.test(s)))].slice(0, max);
}

function read(name: string, max: number): string[] {
  return parseSlugs(document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))?.[1], max);
}

function write(name: string, slugs: string[]) {
  document.cookie = slugs.length ? `${name}=${slugs.join(".")}; path=/; max-age=${MAX_AGE}; samesite=lax` : `${name}=; path=/; max-age=0; samesite=lax`;
  window.dispatchEvent(new Event(SHELF_EVENT));
}

export const seen = () => read(SEEN_COOKIE, MAX_SEEN);
export const compared = () => read(COMPARE_COOKIE, MAX_COMPARE);

export function rememberSeen(slug: string) {
  write(SEEN_COOKIE, [slug, ...seen().filter((s) => s !== slug)].slice(0, MAX_SEEN));
}
export const forgetSeen = () => write(SEEN_COOKIE, []);

/** Adds or removes a product; false when the list is already full. */
export function toggleCompare(slug: string): boolean {
  const list = compared();
  if (list.includes(slug)) return write(COMPARE_COOKIE, list.filter((s) => s !== slug)), true;
  if (list.length >= MAX_COMPARE) return false;
  write(COMPARE_COOKIE, [...list, slug]);
  return true;
}
export const setCompared = (slugs: string[]) => write(COMPARE_COOKIE, slugs.slice(0, MAX_COMPARE));
