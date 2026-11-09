/** Curated department photographs, by category slug. A department without one gets a tinted tile. */
export const CATEGORY_IMAGES: Record<string, string> = {
  fashion: "/images/categories/fashion.jpg",
  electronics: "/images/categories/electronics.jpg",
  "home-living": "/images/categories/home-living.jpg",
  "beauty-personal-care": "/images/categories/beauty-personal-care.jpg",
  automotive: "/images/categories/automotive.jpg",
  "sports-outdoors": "/images/categories/sports-outdoors.jpg",
  "industrial-business": "/images/categories/industrial-business.jpg",
  "tools-hardware": "/images/categories/tools-hardware.jpg",
};

const TINTS = ["mint", "sky", "butter", "clay", "stone"] as const;
export type Tint = (typeof TINTS)[number];

export const tintVar = (tint: Tint) => `var(--store-tint-${tint})`;

/** Tints in a fixed rotation, so neighbours differ. */
export const tintAt = (index: number): Tint => TINTS[index % TINTS.length];
