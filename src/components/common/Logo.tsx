import { Link } from '@/i18n/navigation';

type LogoVariant = "symbol" | "lockup" | "wordmark" | "endorsed";

// Each file's viewBox aspect ratio (public/images/logo/tracecart-*.svg).
const ASPECT: Record<LogoVariant, number> = {
  symbol: 1,
  lockup: 477.7 / 65.9,
  wordmark: 405.2 / 65.9,
  endorsed: 477.7 / 106.3,
};

const DEFAULT_HEIGHT: Record<LogoVariant, number> = {
  symbol: 28,
  lockup: 24,
  wordmark: 24,
  endorsed: 40,
};

/**
 * Tracecart logo (design system Logos: lockup = default, symbol = the Trace
 * for ≤32px and collapsed nav, wordmark when the symbol is already nearby,
 * endorsed = with "a roleback company" for footers and legal). Renders both
 * the ink and white SVG, toggling visibility by theme (the files hardcode
 * fill="#0e0e0c"/"#ffffff" rather than currentColor, so a CSS-only swap is
 * simpler than recoloring at runtime). Minimum: symbol 16px, lockup 72px wide.
 */
export function Logo({
  variant = "symbol",
  height,
  href = "/",
  className = "",
}: {
  variant?: LogoVariant;
  height?: number;
  href?: string | null;
  className?: string;
}) {
  const h = height ?? DEFAULT_HEIGHT[variant];
  const w = Math.round(h * ASPECT[variant]);
  const img = (
    <span className={`relative inline-block ${className}`} style={{ width: w, height: h }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/images/logo/tracecart-${variant}.svg`}
        alt="Tracecart"
        width={w}
        height={h}
        className="block dark:hidden"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/images/logo/tracecart-${variant}-white.svg`}
        alt="Tracecart"
        width={w}
        height={h}
        className="hidden dark:block"
      />
    </span>
  );

  if (!href) return img;
  return <Link href={href}>{img}</Link>;
}
