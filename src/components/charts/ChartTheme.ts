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
        abidjan: "#7c3aed",
        handoff: "#f5a524",
        niamey: "#3b82f6",
        success: "#12b76a",
        warning: "#f79009",
        error: "#f04438",
        gray: "#98a2b3",
      },
      axisLabelColor: isDark ? "#98a2b3" : "#667085",
      gridColor: isDark ? "#1d2939" : "#f2f4f7",
      tooltipTheme: isDark ? ("dark" as const) : ("light" as const),
      fontFamily: "Outfit, sans-serif",
    }),
    [isDark]
  );
}

export type ApexTheme = ReturnType<typeof useApexTheme>;

// A small qualitative palette for categorical breakdowns (provider/destination),
// not tied to corridor-phase semantics since those dimensions aren't phases.
export const QUALITATIVE_PALETTE = ["#7c3aed", "#3b82f6", "#f5a524", "#12b76a", "#f79009", "#98a2b3"];
