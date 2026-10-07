"use client";

import { useMemo } from "react";
import { useTheme } from "@/context/ThemeContext";

// ApexCharts renders series/axis/tooltip colors as JS options baked into an
// SVG — it does not react to Tailwind's `dark:` class variant at all, only
// the DOM-level legend/tooltip text picks up the .apexcharts-* CSS overrides
// already in globals.css. Any chart's own `options` must be rebuilt from this
// hook (memoized on theme) so toggling dark mode actually recolors it.
export function useApexTheme() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return useMemo(
    () => ({
      mode: isDark ? ("dark" as const) : ("light" as const),
      colors: {
        // brand = Corridor Green, the one Terravia accent — same value as
        // success/transit by design (docs/brand/terravia-brand-guidelines.md).
        brand: "#19d36b",
        origin: "#2440e0",
        handoff: "#fdd40a",
        transit: "#19d36b",
        success: "#19d36b",
        warning: "#fdd40a",
        error: "#c41d14",
        info: "#2440e0",
        gray: "#98a2b3",
      },
      axisLabelColor: isDark ? "#98a2b3" : "#667085",
      gridColor: isDark ? "#1d2939" : "#f2f4f7",
      tooltipTheme: isDark ? ("dark" as const) : ("light" as const),
      fontFamily: "Bricolage Grotesque, sans-serif",
    }),
    [isDark]
  );
}

export type ApexTheme = ReturnType<typeof useApexTheme>;

// A small qualitative palette for categorical breakdowns (provider/destination),
// not tied to corridor-phase semantics since those dimensions aren't phases.
export const QUALITATIVE_PALETTE = ["#19d36b", "#2440e0", "#fdd40a", "#c41d14", "#667085", "#98a2b3"];
