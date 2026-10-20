"use client";

import { useEffect, useState } from "react";
import { PanelShell } from "./PanelShell";
import { TrendChart } from "@/components/charts/TrendChart";
import { fetchTrend } from "@/lib/kpi/adapter";
import { Granularity, TrendSeries } from "@/lib/kpi/types";

const GRANULARITY_LABELS: Record<Granularity, string> = { day: "Jour", week: "Semaine", month: "Mois" };

export function TrendPanel({ rangeDays }: { rangeDays: number }) {
  const [granularity, setGranularity] = useState<Granularity>("day");
  // What was last loaded, and for which selection: loading is "the result
  // isn't for the current selection yet", so nothing resets state in the effect.
  const key = `${granularity}:${rangeDays}`;
  const [result, setResult] = useState<{ key: string; trend: TrendSeries | null; error: string | null } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchTrend(granularity, rangeDays).then(
      (trend) => !cancelled && setResult({ key, trend, error: null }),
      (err) =>
        !cancelled &&
        setResult({ key, trend: null, error: err instanceof Error ? err.message : "Impossible de charger la tendance" })
    );
    return () => {
      cancelled = true;
    };
  }, [granularity, rangeDays, key]);

  const current = result?.key === key ? result : null;
  const loading = current === null;
  const trend = current?.trend ?? null;
  const error = current?.error ?? null;

  return (
    <PanelShell
      title="Commandes créées vs livrées"
      loading={loading}
      error={error}
      empty={!!trend && trend.points.length === 0}
      emptyLabel="Aucune commande sur cette période."
      action={
        <div className="flex gap-1 rounded-[var(--radius-s)] border border-line p-0.5">
          {(Object.keys(GRANULARITY_LABELS) as Granularity[]).map((g) => (
            <button
              key={g}
              onClick={() => setGranularity(g)}
              className={`rounded-[var(--radius-xs)] px-2.5 py-1 text-xs font-medium transition ${
                granularity === g ? "bg-ink text-ink-inverse" : "text-ink-muted hover:bg-surface-sunken"
              }`}
            >
              {GRANULARITY_LABELS[g]}
            </button>
          ))}
        </div>
      }
    >
      {trend && <TrendChart points={trend.points} previousPoints={trend.previousPoints} />}
    </PanelShell>
  );
}
