// The store's pages beside the departments, in the header's bar and the phone's
// menu. Only what exists (no "become a partner" page yet).
export const LINKS = [
  { key: "deals", href: "/deals" },
  { key: "brands", href: "/brands" },
  { key: "ship", href: "/freight" },
  { key: "sell", href: "/sell" },
  { key: "about", href: "/about" },
] as const;

/** "Find it for me", with what's needed already written in. */
export const findHref = (need?: string) => (need ? `/find?q=${encodeURIComponent(need)}` : "/find");
