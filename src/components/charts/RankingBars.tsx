"use client";

import { useApexTheme } from "./ChartTheme";

export interface RankingBarItem {
  key: string;
  label: string;
  value: number;
  logoUrl?: string | null;
}

/**
 * Sorted horizontal bar ranking — the "comparison across categories" chart
 * type. Div-based (like QueueDepthPanel) rather than a 4th ApexCharts type,
 * for the same visual-variety reasoning already applied on the dashboard.
 * Callers are expected to pass items already sorted (every backend ranking
 * endpoint in this app sorts server-side).
 */
export function RankingBars({ items, valueSuffix = "" }: { items: RankingBarItem[]; valueSuffix?: string }) {
  const theme = useApexTheme();
  const max = Math.max(1, ...items.map((i) => i.value));

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.key}>
          <div className="mb-1 flex items-center gap-2">
            {item.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.logoUrl}
                alt=""
                className="h-5 w-5 flex-shrink-0 rounded-full border border-line bg-surface-raised object-contain p-0.5"
              />
            ) : (
              <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: theme.colors.ink }} />
            )}
            <span className="min-w-0 flex-1 truncate text-sm text-ink">{item.label}</span>
            <span className="flex-shrink-0 text-xs tabular-nums text-ink-muted">
              {item.value.toLocaleString("fr-FR")}
              {valueSuffix}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-surface-sunken">
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.max(4, (item.value / max) * 100)}%`, backgroundColor: theme.colors.ink }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
