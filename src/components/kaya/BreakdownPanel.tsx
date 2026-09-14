"use client";

import { useEffect, useState } from "react";
import { PanelShell } from "./PanelShell";
import { DonutBreakdown } from "@/components/charts/DonutBreakdown";
import { fetchBreakdown } from "@/lib/kpi/adapter";
import { Breakdown, BreakdownDimension } from "@/lib/kpi/types";

const DIMENSION_LABELS: Record<BreakdownDimension, string> = { provider: "Par boutique", destination: "Par destination" };

export function BreakdownPanel({ rangeDays }: { rangeDays: number }) {
  const [dimension, setDimension] = useState<BreakdownDimension>("provider");
  const [breakdown, setBreakdown] = useState<Breakdown | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchBreakdown(dimension, rangeDays)
      .then((data) => {
        if (!cancelled) setBreakdown(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Impossible de charger la répartition");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [dimension, rangeDays]);

  return (
    <PanelShell
      title="Répartition"
      loading={loading}
      error={error}
      empty={!!breakdown && breakdown.slices.length === 0}
      emptyLabel="Aucune commande sur cette période."
      action={
        <div className="flex gap-1 rounded-lg border border-gray-200 p-0.5 dark:border-gray-700">
          {(Object.keys(DIMENSION_LABELS) as BreakdownDimension[]).map((d) => (
            <button
              key={d}
              onClick={() => setDimension(d)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                dimension === d
                  ? "bg-abidjan-600 text-white"
                  : "text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-white/5"
              }`}
            >
              {DIMENSION_LABELS[d]}
            </button>
          ))}
        </div>
      }
    >
      {breakdown && <DonutBreakdown slices={breakdown.slices} />}
    </PanelShell>
  );
}
