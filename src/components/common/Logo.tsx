import Link from "next/link";

type LogoVariant = "symbol";

const DIMENSIONS: Record<LogoVariant, { width: number; height: number }> = {
  symbol: { width: 28, height: 28 },
};

/**
 * TraceCart logo. Renders both the ink and white SVG, toggling visibility by
 * theme (the source files hardcode fill="#0e0e0c"/"#ffffff" rather than
 * currentColor, so a CSS-only swap is simpler than recoloring at runtime).
 * NOTE: the old lockup/wordmark/endorsed files drew out "Terravia" as real
 * artwork, so they were deleted rather than relabeled — only the symbol mark
 * (no text) survived the rename. Add a "lockup" variant back once a
 * TraceCart wordmark exists.
 */
export function Logo({
  variant = "symbol",
  href = "/",
  className = "",
}: {
  variant?: LogoVariant;
  href?: string | null;
  className?: string;
}) {
  const { width, height } = DIMENSIONS[variant];
  const img = (
    <span className={`relative inline-block ${className}`} style={{ width, height }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/images/logo/terravia-${variant}.svg`}
        alt="TraceCart"
        width={width}
        height={height}
        className="block dark:hidden"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/images/logo/terravia-${variant}-white.svg`}
        alt="TraceCart"
        width={width}
        height={height}
        className="hidden dark:block"
      />
    </span>
  );

  if (!href) return img;
  return <Link href={href}>{img}</Link>;
}
