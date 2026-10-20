"use client";

import { useEffect, useState } from "react";
import { PanelShell } from "./PanelShell";
import { DonutBreakdown } from "@/components/charts/DonutBreakdown";
import { fetchBreakdown } from "@/lib/kpi/adapter";
import { Breakdown, BreakdownDimension } from "@/lib/kpi/types";

const DIMENSION_LABELS: Record<BreakdownDimension, string> = { provider: "Par boutique", destination: "Par destination" };

export function BreakdownPanel({ rangeDays }: { rangeDays: number }) {
  const [dimension, setDimension] = useState<BreakdownDimension>("provider");
  // What was last loaded, and for which selection: loading is "the result
  // isn't for the current selection yet", so nothing resets state in the effect.
  const key = `${dimension}:${rangeDays}`;
  const [result, setResult] = useState<{ key: string; breakdown: Breakdown | null; error: string | null } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchBreakdown(dimension, rangeDays).then(
      (breakdown) => !cancelled && setResult({ key, breakdown, error: null }),
      (err) =>
        !cancelled &&
        setResult({ key, breakdown: null, error: err instanceof Error ? err.message : "Impossible de charger la répartition" })
    );
    return () => {
      cancelled = true;
    };
  }, [dimension, rangeDays, key]);

  const current = result?.key === key ? result : null;
  const loading = current === null;
  const breakdown = current?.breakdown ?? null;
  const error = current?.error ?? null;

  return (
    <PanelShell
      title="Répartition"
      loading={loading}
      error={error}
      empty={!!breakdown && breakdown.slices.length === 0}
      emptyLabel="Aucune commande sur cette période."
      action={
        <div className="flex gap-1 rounded-[var(--radius-s)] border border-line p-0.5">
          {(Object.keys(DIMENSION_LABELS) as BreakdownDimension[]).map((d) => (
            <button
              key={d}
              onClick={() => setDimension(d)}
              className={`rounded-[var(--radius-xs)] px-2.5 py-1 text-xs font-medium transition ${
                dimension === d ? "bg-ink text-ink-inverse" : "text-ink-muted hover:bg-surface-sunken"
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
