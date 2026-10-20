/**
 * Maps Clerk's components onto TraceCart's design tokens (globals.css), so
 * sign-in doesn't look like a different product. Same approach as Roleback.
 */
export const clerkAppearance = {
  variables: {
    colorPrimary: "var(--color-accent)",
    colorText: "var(--color-ink)",
    colorTextSecondary: "var(--color-ink-muted)",
    colorBackground: "var(--color-surface-raised)",
    colorInputBackground: "var(--color-surface)",
    colorInputText: "var(--color-ink)",
    colorDanger: "var(--color-critical)",
    borderRadius: "var(--radius-s)",
    fontFamily: "inherit",
  },
  elements: {
    rootBox: "w-full",
    cardBox: "w-full shadow-none",
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
