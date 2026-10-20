"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import type { ApexOptions } from "apexcharts";
import { useApexTheme, QUALITATIVE_PALETTE } from "./ChartTheme";
import { BreakdownSlice } from "@/lib/kpi/types";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

export function DonutBreakdown({ slices, height = 220 }: { slices: BreakdownSlice[]; height?: number }) {
  const theme = useApexTheme();
  const total = slices.reduce((sum, s) => sum + s.count, 0);

  const options: ApexOptions = useMemo(
    () => ({
      chart: { type: "donut", fontFamily: theme.fontFamily, background: "transparent" },
      theme: { mode: theme.mode },
      labels: slices.map((s) => s.label),
      colors: QUALITATIVE_PALETTE,
      legend: { show: false },
      dataLabels: { enabled: false },
      tooltip: { theme: theme.tooltipTheme },
      stroke: { width: 0 },
      plotOptions: {
        pie: {
          donut: {
            labels: {
              show: true,
              total: { show: true, label: "Total", color: theme.axisLabelColor },
            },
          },
        },
      },
    }),
    [theme, slices]
  );

  // Side by side only when the panel itself is wide enough (container query):
  // the chart often sits in a narrow column on a wide screen.
  return (
    <div className="@container">
    <div className="flex flex-col items-center gap-4 @md:flex-row @md:items-center">
      <div className="w-full max-w-[220px] flex-shrink-0">
        <ReactApexChart options={options} series={slices.map((s) => s.count)} type="donut" height={height} />
      </div>
      <ul className="w-full min-w-0 space-y-2">
        {slices.map((slice, i) => {
          const pct = total > 0 ? Math.round((slice.count / total) * 100) : 0;
          return (
            <li key={slice.key} className="flex items-center gap-2.5">
              {slice.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={slice.logoUrl}
                  alt=""
                  className="h-6 w-6 flex-shrink-0 rounded-full border border-line bg-surface-raised object-contain p-0.5"
                />
              ) : (
                <span
                  className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                  style={{ backgroundColor: QUALITATIVE_PALETTE[i % QUALITATIVE_PALETTE.length] }}
                />
              )}
              <span className="min-w-0 flex-1 truncate text-sm text-ink">
                {slice.label}
                {i === 0 && slices.length > 1 && (
                  <span className="ml-1.5 rounded-full bg-accent-soft px-1.5 py-0.5 text-[10px] font-medium text-accent-ink">
                    Le plus utilisé
                  </span>
                )}
              </span>
              <span className="flex-shrink-0 text-xs tabular-nums text-ink-muted">
                {slice.count} · {pct}%
              </span>
            </li>
          );
        })}
      </ul>
    </div>
    </div>
  );
}
