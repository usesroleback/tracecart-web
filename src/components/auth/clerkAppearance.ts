import type { ComponentProps } from "react";
import type { ClerkProvider } from "@clerk/nextjs";

/**
 * Maps Clerk's components onto Tracecart's design tokens (globals.css), so
 * sign-in doesn't look like a different product, and follows dark mode
 * because the tokens do. Typed from ClerkProvider so a renamed variable
 * (Clerk 7 renamed colorText → colorForeground, etc.) fails type-checking.
 */
export const clerkAppearance: ComponentProps<typeof ClerkProvider>["appearance"] = {
  // Clerk's styles go in this cascade layer, which globals.css orders below
  // Tailwind's utilities, so the `elements` classes below can override them.
  cssLayerName: "clerk",
  variables: {
    colorPrimary: "var(--color-accent)",
    colorPrimaryForeground: "var(--color-on-accent)",
    colorForeground: "var(--color-ink)",
    colorMutedForeground: "var(--color-ink-muted)",
    // Clerk derives borders and secondary button text from this; its default
    // (black) disappears on the dark-mode card.
    colorNeutral: "var(--color-ink)",
    colorBackground: "var(--color-surface-raised)",
    colorInput: "var(--color-surface)",
    colorInputForeground: "var(--color-ink)",
    colorBorder: "var(--color-line)",
    colorRing: "var(--color-focus-ring)",
    colorDanger: "var(--color-critical)",
    borderRadius: "var(--radius-s)",
    fontFamily: "inherit",
  },
  elements: {
    rootBox: "w-full",
    // The pop-up sign-in window: wider than Clerk's 25rem, never wider than a phone.
    modalContent: "w-[min(30rem,calc(100vw-2rem))] max-w-none",
    cardBox: "w-full max-w-none shadow-none",
    card: "shadow-none border border-line rounded-[var(--radius-m)] bg-surface-raised",
    headerTitle: "hidden",
    headerSubtitle: "hidden",
    socialButtonsBlockButton: "border border-line-strong hover:bg-surface-sunken",
    formButtonPrimary: "bg-accent hover:opacity-90 text-on-accent font-semibold normal-case",
    footerActionLink: "text-ink underline",
    formFieldInput: "border border-line-strong bg-surface",
    dividerLine: "bg-line",
    dividerText: "text-ink-muted",
  },
};
