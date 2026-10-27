/**
 * Photos filling image slots, by slot name (files in public/images/home).
 * A slot missing here still shows its placeholder: see PLACEHOLDERS.md.
 * `position` is the CSS object-position, to keep faces in frame when a slot
 * crops the photo; `sizes` is the rendered width, for next/image.
 */
export const IMAGES: Record<string, { src: string; position?: string; sizes: string }> = {
  "hero-arrival": { src: "/images/home/hero-arrival.jpg", position: "40% 35%", sizes: "100vw" },
  "service-sourcing": { src: "/images/home/service-sourcing.jpg", position: "50% 30%", sizes: "(min-width: 768px) 50vw, 100vw" },
  "service-tracking": { src: "/images/home/service-tracking.jpg", position: "60% 40%", sizes: "(min-width: 768px) 50vw, 100vw" },
};
