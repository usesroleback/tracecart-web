"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import type { ApexOptions } from "apexcharts";
import { useApexTheme } from "./ChartTheme";
import { TrendPoint } from "@/lib/kpi/types";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

export function TrendChart({
  points,
  previousPoints,
  height = 280,
}: {
  points: TrendPoint[];
  previousPoints?: TrendPoint[];
  height?: number;
}) {
  const theme = useApexTheme();
  const t = useTranslations("dashboard.trend");

  const series = useMemo(() => {
    const s = [
      { name: t("created"), data: points.map((p) => p.created) },
      { name: t("delivered"), data: points.map((p) => p.delivered) },
    ];
    if (previousPoints && previousPoints.length > 0) {
      s.push({ name: t("createdBefore"), data: previousPoints.map((p) => p.created) });
    }
    return s;
  }, [points, previousPoints, t]);

  const options: ApexOptions = useMemo(
    () => ({
      chart: {
        type: "area",
        toolbar: { show: false },
        fontFamily: theme.fontFamily,
        background: "transparent",
        animations: { enabled: false },
      },
      theme: { mode: theme.mode },
      colors: [theme.colors.brand, theme.colors.origin, theme.colors.gray],
      stroke: { curve: "smooth", width: [2, 2, 1.5], dashArray: [0, 0, 5] },
      fill: { type: ["gradient", "gradient", "solid"], opacity: [0.15, 0.15, 0] },
      grid: { borderColor: theme.gridColor, strokeDashArray: 4 },
      dataLabels: { enabled: false },
      xaxis: {
        categories: points.map((p) => p.date),
        labels: { style: { colors: theme.axisLabelColor, fontSize: "11px" } },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: { labels: { style: { colors: theme.axisLabelColor, fontSize: "11px" } } },
      legend: { position: "top", horizontalAlign: "left", labels: { colors: theme.axisLabelColor } },
      tooltip: { theme: theme.tooltipTheme },
    }),
    [theme, points]
  );

  return <ReactApexChart options={options} series={series} type="area" height={height} />;
}
