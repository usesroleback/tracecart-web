import Link from "next/link";

type LogoVariant = "lockup" | "symbol";

const DIMENSIONS: Record<LogoVariant, { width: number; height: number }> = {
  lockup: { width: 140, height: 23 },
  symbol: { width: 28, height: 28 },
};

/**
 * TraceCart logo. Renders both the ink and white SVG, toggling visibility by
 * theme (the source files hardcode fill="#0e0e0c"/"#ffffff" rather than
 * currentColor, so a CSS-only swap is simpler than recoloring at runtime).
 * Per docs/brand/README.md: symbol alone at <=32px, full lockup otherwise.
 * NOTE: the underlying SVG assets and alt text below still say "Terravia" —
 * they're real drawn artwork from before the TraceCart rename and can't be
 * fixed by a text edit. Swap them once new TraceCart logo files exist.
 */
export function Logo({
  variant = "lockup",
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
        alt="Terravia"
        width={width}
        height={height}
        className="block dark:hidden"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/images/logo/terravia-${variant}-white.svg`}
        alt="Terravia"
        width={width}
        height={height}
        className="hidden dark:block"
      />
    </span>
  );

  if (!href) return img;
  return <Link href={href}>{img}</Link>;
}
