import type { CSSProperties, ReactNode } from "react";
import { Link } from "@/i18n/navigation";

/** `• Label •`, above each section's headline. */
export function Eyebrow({ children, tone = "light" }: { children: ReactNode; tone?: "light" | "raised" | "dark" }) {
  return (
    <p
      className={`inline-flex items-center gap-2 rounded-[var(--hp-radius-chip)] px-3.5 py-1.5 text-[13px] font-medium ${
        tone === "dark"
          ? "bg-[var(--hp-dark-raised)] text-[var(--hp-on-dark-muted)]"
          : tone === "raised"
            ? "bg-[var(--hp-light-raised)] text-[var(--hp-text-muted)]"
            : "bg-[var(--hp-light-sunken)] text-[var(--hp-text-muted)]"
      }`}
    >
      <span aria-hidden className="size-1 rounded-full bg-current" />
      {children}
      <span aria-hidden className="size-1 rounded-full bg-current" />
    </p>
  );
}

/**
 * An image still to come: a neutral block with its slot name, at its final
 * aspect ratio. Swap for <Image> once the file exists (see PLACEHOLDERS.md).
 */
export function ImageSlot({
  name,
  ratio,
  alt,
  tone = "light",
  className = "",
  children,
}: {
  name: string;
  ratio?: string;
  alt: string;
  tone?: "light" | "dark";
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div
      // alt="" is a decorative image, as with <img>.
      {...(alt ? { role: "img", "aria-label": alt } : { "aria-hidden": true })}
      data-image-slot={name}
      className={`relative flex items-center justify-center overflow-hidden ${
        tone === "dark" ? "bg-[var(--hp-slot-dark)] text-[var(--hp-on-dark-muted)]" : "bg-[var(--hp-slot)] text-[var(--hp-text-muted)]"
      } ${ratio ? "aspect-[var(--hp-ratio)]" : ""} ${className}`}
      // Through a variable, so a responsive class (lg:aspect-auto) can still override it.
      style={ratio ? ({ "--hp-ratio": ratio } as CSSProperties) : undefined}
    >
      <span aria-hidden className="rb-mono-s px-2 text-center opacity-80">
        IMG: {name}
        {ratio ? ` ${ratio.replace("/", ":")}` : ""}
      </span>
      {children}
    </div>
  );
}

export function ArrowIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
      <path d="M4.5 11.5 11.5 4.5M5.5 4.5h6v6" />
    </svg>
  );
}

type PillTone = "dark" | "light" | "primary" | "secondary" | "outline" | "outline-dark";

const PILL: Record<PillTone, string> = {
  dark: "bg-[var(--hp-dark)] text-[var(--hp-on-dark)] shadow-[var(--hp-shadow)]",
  light: "bg-white text-[#0d0f0e]",
  primary: "bg-[var(--hp-primary)] text-[var(--hp-on-primary)]",
  secondary: "bg-[var(--hp-secondary)] text-[var(--hp-text)]",
  outline: "border border-[var(--color-line-strong)] text-[var(--hp-text)] hover:bg-[var(--hp-light-sunken)]",
  "outline-dark": "border border-white/25 text-[var(--hp-on-dark)] hover:bg-white/5",
};

/**
 * The site's button: label plus a square ↗ on the right (outline buttons
 * have none). Named for its first shape; corners follow --hp-radius-control. `href` may be "#" for a page that doesn't exist yet.
 */
export function PillLink({
  href,
  children,
  tone = "dark",
  arrow = tone !== "outline" && tone !== "outline-dark",
  block = false,
  className = "",
}: {
  href: string;
  children: ReactNode;
  tone?: PillTone;
  arrow?: boolean;
  block?: boolean;
  className?: string;
}) {
  const circle = tone === "light" || tone === "secondary" ? "bg-[var(--hp-dark)] text-white" : "bg-white text-[#0d0f0e]";
  const classes = `inline-flex min-h-12 items-center gap-3 rounded-[var(--hp-radius-control)] text-[15px] font-semibold transition-transform hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 ${
        arrow ? "py-1.5 pl-5 pr-1.5" : "px-5 py-2.5"
      } ${block ? "w-full justify-between" : ""} ${PILL[tone]} ${className}`;
  const content = (
    <>
      <span>{children}</span>
      {arrow && (
        <span className={`grid size-9 shrink-0 place-items-center rounded-[var(--hp-radius-chip)] ${circle}`}>
          <ArrowIcon />
        </span>
      )}
    </>
  );
  // App pages go through the locale-aware Link; anchors and "#" stay plain.
  if (href.startsWith("/")) {
    return (
      <Link href={href} className={classes}>
        {content}
      </Link>
    );
  }
  return (
    <a href={href} className={classes}>
      {content}
    </a>
  );
}

/** Wraps a placeholder figure so it's easy to find and replace. */
export function Placeholder({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span data-placeholder="figure" className={className}>
      {children}
    </span>
  );
}
