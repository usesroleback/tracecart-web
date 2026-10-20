import { useLocale } from "next-intl";

/** The BCP 47 tag numbers and dates are written in: day-first English, French French. */
export function intlLocale(locale: string): string {
  return locale === "en" ? "en-GB" : "fr-FR";
}

export type Format = ReturnType<typeof makeFormat>;

export function makeFormat(locale: string) {
  const tag = intlLocale(locale);
  const number = (n: number, digits?: number) =>
    n.toLocaleString(tag, digits == null ? undefined : { maximumFractionDigits: digits });
  return {
    locale,
    number,
    /** "125 000 XOF": the amount in the locale's grouping, then the currency code. */
    money: (value: number | string, currency?: string | null) => `${number(Number(value))}${currency ? ` ${currency}` : ""}`,
    hours: (h: number) => `${number(h, 1)} h`,
    percent: (p: number) => `${number(p, 1)}%`,
    /** "lun. 20 oct." / "Mon 20 Oct" */
    day: (iso: string | Date) => new Date(iso).toLocaleDateString(tag, { weekday: "short", day: "numeric", month: "short" }),
    /** "20 oct." / "20 Oct" */
    shortDate: (iso: string | Date) => new Date(iso).toLocaleDateString(tag, { day: "2-digit", month: "short" }),
    /** "lun. 20 oct., 14:05" */
    dayTime: (iso: string | Date) =>
      new Date(iso).toLocaleString(tag, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }),
    dateTime: (iso: string | Date) => new Date(iso).toLocaleString(tag, { dateStyle: "medium", timeStyle: "short" }),
    date: (iso: string | Date) => new Date(iso).toLocaleDateString(tag, { dateStyle: "medium" }),
    time: (iso: string | Date) => new Date(iso).toLocaleTimeString(tag, { hour: "2-digit", minute: "2-digit" }),
    /** "il y a 5 min" / "5 min ago"; "maintenant" / "now" under a minute. */
    ago: (iso: string | Date) => {
      const rtf = new Intl.RelativeTimeFormat(tag, { numeric: "auto", style: "short" });
      const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
      if (minutes < 1) return rtf.format(0, "second");
      if (minutes < 60) return rtf.format(-minutes, "minute");
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return rtf.format(-hours, "hour");
      return rtf.format(-Math.floor(hours / 24), "day");
    },
  };
}

/** Number and date formatting in the current page's language. */
export function useFormat(): Format {
  return makeFormat(useLocale());
}
