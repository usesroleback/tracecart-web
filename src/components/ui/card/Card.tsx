import React, { ReactNode } from "react";

type CardVariant = "default" | "flat" | "sunken" | "inverse";

interface CardProps {
  children: ReactNode;
  variant?: CardVariant;
  /** The broken corner (.sq-card--route): top-left 16px, the rest 2px. Max 1-2 per view. */
  route?: boolean;
  /** .sq-card--corner: top-right broken instead — the Jobs-style corner, rarely needed here. */
  corner?: boolean;
  interactive?: boolean;
  selected?: boolean;
  className?: string;
  as?: "div" | "section";
}

const VARIANT_CLASSES: Record<CardVariant, string> = {
  default: "bg-surface-raised border border-line",
  flat: "bg-transparent border-0",
  sunken: "bg-surface-sunken border-0",
  inverse: "bg-surface-inverse text-ink-inverse border-0",
};

/** Terravia .sq-card (bundle.css L155-164): borders first, shadow only on hover/interactive. */
export function Card({
  children,
  variant = "default",
  route = false,
  corner = false,
  interactive = false,
  selected = false,
  className = "",
  as = "div",
}: CardProps) {
  const Tag = as;
  const radius = route
    ? "rounded-tl-[var(--radius-l)] rounded-tr-[var(--radius-xs)] rounded-br-[var(--radius-xs)] rounded-bl-[var(--radius-xs)]"
    : corner
      ? "rounded-[var(--radius-m)] rounded-tr-none"
      : "rounded-[var(--radius-m)]";

  return (
    <Tag
      className={`relative p-[var(--space-5)] text-ink transition-[transform,box-shadow,border-color] duration-[var(--duration-base)] ease-[var(--ease-out)] ${radius} ${VARIANT_CLASSES[variant]} ${
        interactive ? "cursor-pointer hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[var(--shadow-1)] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus-ring" : ""
      } ${selected ? "border-ink shadow-[inset_0_0_0_1px_var(--color-ink)]" : ""} ${className}`}
    >
      {children}
    </Tag>
  );
}
