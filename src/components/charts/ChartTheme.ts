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
        // Exact TraceCart token values (claude.ai/artifact/7FBB9gfizRehvbLFSqr2KF,
        // project/tokens.json) — ApexCharts bakes colors into SVG options, so
        // these stay literal hex rather than CSS vars.
        brand: "#19d36b", // accent
        origin: "#2440e0", // ds-info
        handoff: "#ffd60a", // signal — the "held" state
        transit: "#19d36b",
        success: "#19d36b",
        warning: "#ffd60a",
        error: "#c41d14", // critical
        info: "#2440e0",
        gray: "#6b675f", // stone
      },
      axisLabelColor: isDark ? "#a3aaa5" : "#575d59", // ink-muted
      gridColor: isDark ? "#2e3330" : "#d9dcd7", // line
      tooltipTheme: isDark ? ("dark" as const) : ("light" as const),
      fontFamily: "Bricolage Grotesque, sans-serif",
    }),
    [isDark]
  );
}

export type ApexTheme = ReturnType<typeof useApexTheme>;

// A small qualitative palette for categorical breakdowns (provider/destination),
// not tied to corridor-phase semantics since those dimensions aren't phases.
export const QUALITATIVE_PALETTE = ["#19d36b", "#2440e0", "#ffd60a", "#c41d14", "#6b675f", "#858b86"];
