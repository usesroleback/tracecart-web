"use client";

import { useApexTheme } from "./ChartTheme";

/**
 * Actual value vs. a configurable target — a horizontal bar with a target
 * marker line, the classic bullet-chart shape. No native ApexCharts bullet
 * type exists, so this is a small div/SVG primitive rather than a chart-lib
 * hack; it stays visually consistent with RankingBars/QueueDepthPanel.
 */
export function BulletChart({
  label,
  value,
  target,
  format = (v: number) => `${v}%`,
}: {
  label: string;
  value: number;
  target: number;
  format?: (v: number) => string;
}) {
  const theme = useApexTheme();
  const max = Math.max(value, target) * 1.25 || 1;
  const valuePct = Math.min(100, (value / max) * 100);
  const targetPct = Math.min(100, (target / max) * 100);
  const onTarget = value >= target;

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-sm">
        <span className="font-medium text-ink">{label}</span>
        <span className={`text-xs font-medium ${onTarget ? "text-positive" : "text-attn"}`}>
          {format(value)} <span className="text-ink-muted">/ objectif {format(target)}</span>
        </span>
      </div>
      <div className="relative h-3 w-full overflow-visible rounded-full bg-surface-sunken">
        <div
          className="h-full rounded-full"
          style={{ width: `${valuePct}%`, backgroundColor: onTarget ? theme.colors.success : theme.colors.brand }}
        />
        <div
          className="absolute top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-ink"
          style={{ left: `${targetPct}%` }}
          title={`Objectif : ${format(target)}`}
        />
      </div>
    </div>
  );
}
