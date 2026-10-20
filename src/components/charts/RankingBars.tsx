"use client";

import { useApexTheme } from "./ChartTheme";
import { useFormat } from "@/lib/format";

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
export function RankingBars({
  items,
  valueSuffix = "",
  formatValue,
  topBadge,
}: {
  items: RankingBarItem[];
  valueSuffix?: string;
  /** Replaces the plain number, e.g. "8 · 53 %". */
  formatValue?: (item: RankingBarItem) => string;
  /** A word beside the first item when there are several (e.g. "Most used"). */
  topBadge?: string;
}) {
  const theme = useApexTheme();
  const f = useFormat();
  const max = Math.max(1, ...items.map((i) => i.value));

  return (
    <ul className="space-y-3">
      {items.map((item, i) => (
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
            <span className="min-w-0 flex-1 truncate text-sm text-ink">
              {item.label}
              {topBadge && i === 0 && items.length > 1 && (
                <span className="ml-1.5 rounded-[var(--radius-xs)] bg-surface-sunken px-1.5 py-0.5 text-[11px] font-semibold text-ink">
                  {topBadge}
                </span>
              )}
            </span>
            <span className="flex-shrink-0 text-xs tabular-nums text-ink-muted">
              {formatValue ? formatValue(item) : `${f.number(item.value)}${valueSuffix}`}
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
