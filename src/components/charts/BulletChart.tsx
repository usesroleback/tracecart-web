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
        <span className="font-medium text-gray-700 dark:text-gray-200">{label}</span>
        <span className={`text-xs font-medium ${onTarget ? "text-success-600 dark:text-success-400" : "text-warning-600 dark:text-warning-400"}`}>
          {format(value)} <span className="text-gray-400">/ objectif {format(target)}</span>
        </span>
      </div>
      <div className="relative h-3 w-full overflow-visible rounded-full bg-gray-100 dark:bg-white/5">
        <div
          className="h-full rounded-full"
          style={{ width: `${valuePct}%`, backgroundColor: onTarget ? theme.colors.success : theme.colors.abidjan }}
        />
        <div
          className="absolute top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-gray-700 dark:bg-white"
          style={{ left: `${targetPct}%` }}
          title={`Objectif : ${format(target)}`}
        />
      </div>
    </div>
  );
}
