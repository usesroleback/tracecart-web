/**
 * The route motif (docs/brand/tracecart-brand-guidelines.md: "a 4px ink line
 * with a single rounded turn, a round origin and a square destination, often
 * on a faint dot grid"). Abstract geography — no basemap, no real
 * coordinates implied, just the shape of a corridor.
 */
export function RouteDrawing({
  originLabel = "ORIGIN",
  destinationLabel = "DESTINATION",
  className = "",
}: {
  originLabel?: string;
  destinationLabel?: string;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 440 300"
      className={className}
      role="img"
      aria-label={`Route from ${originLabel} to ${destinationLabel}`}
    >
      <defs>
        <pattern id="route-dots" width="22" height="22" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.4" fill="var(--color-line-strong)" />
        </pattern>
      </defs>
      <rect x="0" y="0" width="440" height="300" fill="url(#route-dots)" opacity="0.5" />

      <path
        d="M60,230 H330 A28,28 0 0 0 358,202 V70"
        fill="none"
        stroke="var(--color-ink)"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <circle cx="60" cy="230" r="6" fill="var(--color-ink)" />
      <rect x="350" y="62" width="16" height="16" rx="2" fill="var(--color-accent)" />

      <text x="60" y="256" className="sq-mono-s" fill="var(--color-ink-muted)" textAnchor="middle">
        {originLabel}
      </text>
      <text x="358" y="52" className="sq-mono-s" fill="var(--color-ink-muted)" textAnchor="middle">
        {destinationLabel}
      </text>
    </svg>
  );
}
