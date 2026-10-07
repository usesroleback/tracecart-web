"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import type { ApexOptions } from "apexcharts";
import { useApexTheme } from "./ChartTheme";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

/**
 * Simple ratio-to-whole radial gauge (e.g. "6 of 8 stores active"). Distinct
 * from BulletChart (actual vs. a configurable target) — this one has no
 * target, just a share of a whole, so a radial-bar reads more naturally than
 * a bar-with-marker.
 */
export function GaugeCard({
  label,
  value,
  total,
  height = 180,
}: {
  label: string;
  value: number;
  total: number;
  height?: number;
}) {
  const theme = useApexTheme();
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;

  const options: ApexOptions = useMemo(
    () => ({
      chart: { type: "radialBar", fontFamily: theme.fontFamily, background: "transparent" },
      theme: { mode: theme.mode },
      colors: [theme.colors.brand],
      plotOptions: {
        radialBar: {
          hollow: { size: "65%" },
          track: { background: theme.gridColor },
          dataLabels: {
            name: { show: true, color: theme.axisLabelColor, fontSize: "12px", offsetY: 24 },
            value: {
              show: true,
              color: theme.mode === "dark" ? "#ffffff" : "#1d2939",
              fontSize: "22px",
              fontWeight: 600,
              offsetY: -12,
              formatter: () => `${value}/${total}`,
            },
          },
        },
      },
      labels: [label],
    }),
    [theme, label, value, total]
  );

  return <ReactApexChart options={options} series={[pct]} type="radialBar" height={height} />;
}
