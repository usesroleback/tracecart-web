import React, { ReactNode } from "react";
import { Link } from "@/i18n/navigation";

type ButtonVariant = "primary" | "secondary" | "ghost" | "inverse" | "danger";
type ButtonSize = "s" | "m" | "l" | "xl";

interface ButtonProps {
  children: ReactNode;
  size?: ButtonSize;
  variant?: ButtonVariant;
  startIcon?: ReactNode;
  endIcon?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  /** The broken corner (.rb-btn--corner) — top-right only, at most once per view. */
  corner?: boolean;
  block?: boolean;
  type?: "button" | "submit";
  className?: string;
  /** Renders an <a> instead of a <button> (same chrome) — for CTAs that navigate, so a <button> never ends up nested inside a surrounding <a>. */
  href?: string;
  /** Required when the button shows only an icon. */
  "aria-label"?: string;
}

const SIZE_CLASSES: Record<ButtonSize, string> = {
  s: "h-[var(--control-s)] px-3 text-sm",
  m: "h-[var(--control-m)] px-4 text-[15px]",
  l: "h-[var(--control-l)] px-6 text-base",
  xl: "h-[var(--control-xl)] px-8 text-lg font-[650]",
};

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-accent text-on-accent after:bg-ink",
  secondary: "bg-surface-raised text-ink border border-line-strong after:bg-ink",
  ghost: "bg-transparent text-ink after:bg-ink",
  inverse: "bg-surface-inverse text-ink-inverse after:bg-ink-inverse",
  danger: "bg-critical text-surface-raised after:bg-ink",
};

/** Design system .rb-btn (bundle.css L37-56): borders-first chrome, 8% ink overlay
 * on hover via the ::after pseudo, translateY(1px) on press, 2px focus-ring,
 * trailing icon nudges 3px on hover. */
const Button: React.FC<ButtonProps> = ({
  children,
  size = "m",
  variant = "primary",
  startIcon,
  endIcon,
  onClick,
  className = "",
  disabled = false,
  loading = false,
  corner = false,
  block = false,
  type = "button",
  href,
  "aria-label": ariaLabel,
}) => {
  const classes = `group/btn relative isolate inline-flex min-w-[var(--control-m)] items-center justify-center gap-2 font-semibold leading-none transition-[background-color,border-color,color,transform] duration-[var(--duration-quick)] ease-[var(--ease-out)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring active:not-disabled:translate-y-px disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:text-ink-muted disabled:border-line after:pointer-events-none after:absolute after:-inset-px after:rounded-[inherit] after:opacity-0 after:transition-opacity after:duration-[var(--duration-quick)] after:ease-[var(--ease-out)] hover:not-disabled:after:opacity-[0.08] ${
    corner ? "rounded-[var(--radius-m)_0_var(--radius-m)_var(--radius-m)]" : "rounded-[var(--radius-s)]"
  } ${block ? "w-full" : ""} ${SIZE_CLASSES[size]} ${VARIANT_CLASSES[variant]} ${className}`;

  const content = (
    <>
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
      ) : (
        startIcon && <span className="flex items-center">{startIcon}</span>
      )}
      {children}
      {!loading && endIcon && (
        <span className="flex items-center transition-transform duration-[var(--duration-quick)] ease-[var(--ease-out)] group-hover/btn:translate-x-[3px]">{endIcon}</span>
      )}
    </>
  );

  // App paths go through the locale-aware Link (localePrefix "always"), so
  // /orders stays /en/orders for an English session; anchors and external
  // URLs stay plain, external ones opening in a new tab.
  if (href && href.startsWith("/") && !href.startsWith("//")) {
    return (
      <Link href={href} className={classes} onClick={onClick} aria-label={ariaLabel}>
        {content}
      </Link>
    );
  }
  if (href) {
    const external = /^https?:\/\//.test(href);
    return (
      <a href={href} className={classes} onClick={onClick} aria-label={ariaLabel} {...(external ? { target: "_blank", rel: "noreferrer" } : {})}>
        {content}
      </a>
    );
  }

  return (
    <button type={type} className={classes} onClick={onClick} disabled={disabled || loading} aria-busy={loading || undefined} aria-label={ariaLabel}>
      {content}
    </button>
  );
};

export default Button;
