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
                className="h-5 w-5 flex-shrink-0 rounded-full border border-gray-200 bg-white object-contain p-0.5 dark:border-gray-700"
              />
            ) : (
              <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: theme.colors.abidjan }} />
            )}
            <span className="min-w-0 flex-1 truncate text-sm text-gray-700 dark:text-gray-200">{item.label}</span>
            <span className="flex-shrink-0 text-xs tabular-nums text-gray-400">
              {item.value.toLocaleString("fr-FR")}
              {valueSuffix}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-white/5">
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.max(4, (item.value / max) * 100)}%`, backgroundColor: theme.colors.abidjan }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
