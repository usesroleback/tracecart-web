import React, { ReactNode } from "react";

type CardVariant = "default" | "flat" | "sunken" | "inverse";

interface CardProps {
  children: ReactNode;
  variant?: CardVariant;
  /** The broken corner (.rb-card--route): top-left 16px, the rest 2px. Max 1-2 per view. */
  route?: boolean;
  /** .rb-card--corner: top-right broken instead — Roleback's Turn corner, rarely needed here. */
  corner?: boolean;
  interactive?: boolean;
  selected?: boolean;
  /** Inner padding in px (bundle.js Card `padding`); 20 by default. */
  padding?: CardPadding;
  className?: string;
  as?: "div" | "section";
}

type CardPadding = 0 | 16 | 20 | 24 | 32;

const PADDING_CLASSES: Record<CardPadding, string> = {
  0: "p-0",
  16: "p-[var(--space-4)]",
  20: "p-[var(--space-5)]",
  24: "p-[var(--space-6)]",
  32: "p-[var(--space-8)]",
};

const VARIANT_CLASSES: Record<CardVariant, string> = {
  default: "bg-surface-raised border border-line",
  flat: "bg-transparent border-0",
  sunken: "bg-surface-sunken border-0",
  inverse: "bg-surface-inverse text-ink-inverse border-0",
};

/** Design system .rb-card (bundle.css L155-164): borders first, shadow only on hover/interactive. */
export function Card({
  children,
  variant = "default",
  route = false,
  corner = false,
  interactive = false,
  selected = false,
  padding = 20,
  className = "",
  as = "div",
}: CardProps) {
  const Tag = as;
  const radius = route
    ? "rounded-tl-[var(--radius-l)] rounded-tr-[var(--radius-xs)] rounded-br-[var(--radius-xs)] rounded-bl-[var(--radius-xs)]"
    : corner
      ? "rounded-[var(--radius-l)_0_var(--radius-l)_var(--radius-l)]"
      : "rounded-[var(--radius-m)]";

  return (
    <Tag
      className={`relative ${PADDING_CLASSES[padding]} text-ink transition-[transform,box-shadow,border-color] duration-[var(--duration-base)] ease-[var(--ease-out)] ${radius} ${VARIANT_CLASSES[variant]} ${
        interactive ? "cursor-pointer hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[var(--shadow-1)] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus-ring" : ""
      } ${selected ? "border-ink shadow-[inset_0_0_0_1px_var(--color-ink)]" : ""} ${className}`}
    >
      {children}
    </Tag>
  );
}
