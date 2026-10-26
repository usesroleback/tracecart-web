/**
 * Every figure on the homepage, in one place. All of them are placeholders
 * (TODO: replace with real figures before this page becomes the homepage);
 * the components render each with data-placeholder so they're easy to find
 * in the page too. Words live in messages/{fr,en}/home.json.
 */

export interface Figure {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
}

export const HERO = {
  onTime: { value: 94, suffix: "%" } satisfies Figure,
  borderWait: { value: -41, suffix: "%" } satisfies Figure,
  // Out of 21 dots (3 × 7), how many fill: roughly the on-time share of the card's "progress".
  dotsOn: 15,
  bars: [38, 52, 44, 61, 49, 72, 88, 81, 64, 70, 58, 66],
  barsHighlighted: [5, 6, 7],
};

export const TRUST = { customers: 120, corridors: 31, avatars: 3, logos: 8 };

// Corridors run weekly, from the current Corridors section: they span several continents.
export const CORRIDORS = [
  { from: "Lomé", to: "Ouagadougou", daysMin: 5, daysMax: 8 },
  { from: "Mersin", to: "Almaty", daysMin: 11, daysMax: 16 },
  { from: "Antofagasta", to: "Santa Cruz", daysMin: 6, daysMax: 9 },
  { from: "Mombasa", to: "Kampala", daysMin: 4, daysMax: 6 },
  { from: "Hamburg", to: "Bratislava", daysMin: 3, daysMax: 4 },
  { from: "Durban", to: "Lusaka", daysMin: 7, daysMax: 10 },
  { from: "Cotonou", to: "Niamey", daysMin: 6, daysMax: 9 },
] as const;

export const RESULTS = {
  onTime: { value: 94, suffix: "%" } satisfies Figure,
  borderWait: { value: -41, suffix: "%" } satisfies Figure,
  borderBars: [70, 64, 58, 61, 52, 47, 44, 42, 40],
  borderBarsHighlighted: [7, 8],
  saving: { value: 31, suffix: "%" } satisfies Figure,
};

export const CASES = [
  { key: "construction", result: { value: 19 } satisfies Figure },
  { key: "clinic", result: { value: 0 } satisfies Figure },
  { key: "agri", result: { value: -34, suffix: "%" } satisfies Figure },
] as const;

export const STATS = [
  { key: "shipments", figure: { value: 1284, suffix: "+" } satisfies Figure },
  { key: "corridors", figure: { value: 31 } satisfies Figure },
  { key: "delivered", figure: { value: 97.6, decimals: 1, suffix: "%" } satisfies Figure },
] as const;

export const PROCESS = { years: { value: 10, suffix: "+" } satisfies Figure };

export const TESTIMONIALS = ["hardware", "clinic", "ngo", "agri"] as const;

// Notes and their reading time in minutes.
export const INSIGHTS = [
  { key: "landed", minutes: 6 },
  { key: "border", minutes: 8 },
  { key: "consolidation", minutes: 5 },
] as const;

/** A figure for the page's language, split so the suffix can be styled apart: "1 284" + "+". */
export function figureParts(f: Figure, locale: string, value = f.value): { body: string; suffix: string } {
  const n = new Intl.NumberFormat(locale, {
    minimumFractionDigits: f.decimals ?? 0,
    maximumFractionDigits: f.decimals ?? 0,
  }).format(Math.abs(value));
  const sign = value < 0 ? "−" : "";
  const suffix = f.suffix === "%" && locale.startsWith("fr") ? " %" : (f.suffix ?? "");
  return { body: `${sign}${f.prefix ?? ""}${n}`, suffix };
}

/** Formats a figure for the page's language: "1 284+" in French, "1,284+" in English. */
export function formatFigure(f: Figure, locale: string, value = f.value): string {
  const { body, suffix } = figureParts(f, locale, value);
  return body + suffix;
}

/**
 * Photos filling image slots, by slot name (files in public/images/home).
 * A slot missing here still shows its placeholder: see PLACEHOLDERS.md.
 * `position` is the CSS object-position, to keep faces in frame when a slot
 * crops the photo; `sizes` is the rendered width, for next/image.
 */
export const IMAGES: Record<string, { src: string; position?: string; sizes: string }> = {
  "hero-arrival": { src: "/images/home/hero-arrival.jpg", position: "40% 35%", sizes: "(min-width: 1024px) 72vw, 100vw" },
  "trust-avatar-1": { src: "/images/home/avatar-trench.jpg", sizes: "44px" },
  "trust-avatar-2": { src: "/images/home/avatar-couple-woman.jpg", sizes: "44px" },
  "trust-avatar-3": { src: "/images/home/avatar-student.jpg", sizes: "44px" },
  "service-sourcing": { src: "/images/home/service-sourcing.jpg", position: "50% 30%", sizes: "(min-width: 768px) 50vw, 100vw" },
  "service-tracking": { src: "/images/home/service-tracking.jpg", position: "60% 40%", sizes: "(min-width: 768px) 50vw, 100vw" },
  "result-customer": { src: "/images/home/result-customer.jpg", position: "50% 30%", sizes: "(min-width: 640px) 176px, 100vw" },
  "process-team": { src: "/images/home/process-team.jpg", sizes: "176px" },
  "testimonial-hardware": { src: "/images/home/avatar-couple-man.jpg", sizes: "80px" },
  "testimonial-clinic": { src: "/images/home/avatar-student.jpg", sizes: "80px" },
  "testimonial-ngo": { src: "/images/home/avatar-street.jpg", sizes: "80px" },
  "testimonial-agri": { src: "/images/home/avatar-couple-woman.jpg", sizes: "80px" },
  "insight-landed": { src: "/images/home/insight-landed.jpg", sizes: "(min-width: 1024px) 720px, 100vw" },
  "insight-consolidation": { src: "/images/home/insight-consolidation.jpg", position: "50% 40%", sizes: "(min-width: 1024px) 220px, 50vw" },
};
