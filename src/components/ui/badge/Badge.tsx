import React, { ReactNode } from "react";

type BadgeVariant = "default" | "outline" | "accent" | "signal" | "inverse" | "positive" | "attn" | "critical" | "info";

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  default: "bg-surface-sunken text-ink",
  outline: "bg-transparent text-ink shadow-[inset_0_0_0_1px_var(--color-line-strong)]",
  accent: "bg-accent text-on-accent",
  signal: "bg-signal text-black",
  inverse: "bg-surface-inverse text-ink-inverse",
  positive: "bg-positive-soft text-positive",
  attn: "bg-attn-soft text-attn",
  critical: "bg-critical-soft text-critical",
  info: "bg-ds-info-soft text-ds-info",
};

/** Design system .rb-badge (bundle.css L169-178). */
export function Badge({ children, variant = "default", className = "" }: { children: ReactNode; variant?: BadgeVariant; className?: string }) {
  return (
    <span
      className={`inline-flex h-[22px] items-center gap-1 whitespace-nowrap rounded-[var(--radius-xs)] px-2 text-xs font-semibold leading-none tracking-[0.01em] ${VARIANT_CLASSES[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
