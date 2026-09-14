"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import type { ApexOptions } from "apexcharts";
import { useApexTheme } from "./ChartTheme";
import { KpiStatus } from "@/lib/kpi/types";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

const STATUS_COLOR_KEY: Record<KpiStatus, "success" | "warning" | "error" | "gray"> = {
  success: "success",
  warning: "warning",
  error: "error",
  neutral: "gray",
};

export function Sparkline({ data, status, height = 32 }: { data: number[]; status: KpiStatus; height?: number }) {
  const theme = useApexTheme();
  const color = theme.colors[STATUS_COLOR_KEY[status]];

  const options: ApexOptions = useMemo(
    () => ({
      chart: { type: "line", sparkline: { enabled: true }, animations: { enabled: false } },
      stroke: { curve: "smooth", width: 2 },
      colors: [color],
      tooltip: { enabled: false },
    }),
    [color]
  );

  if (data.length < 2) return null;

  return (
    <div style={{ width: 72, height }}>
      <ReactApexChart options={options} series={[{ data }]} type="line" height={height} width={72} />
    </div>
  );
}
