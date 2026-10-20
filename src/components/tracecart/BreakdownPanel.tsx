"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { PanelShell } from "./PanelShell";
import { DonutBreakdown } from "@/components/charts/DonutBreakdown";
import { fetchBreakdown } from "@/lib/kpi/adapter";
import { Breakdown, BreakdownDimension } from "@/lib/kpi/types";

const DIMENSIONS: BreakdownDimension[] = ["provider", "destination"];

export function BreakdownPanel({ rangeDays }: { rangeDays: number }) {
  const t = useTranslations("dashboard");
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
        setResult({ key, breakdown: null, error: err instanceof Error ? err.message : t("breakdown.failed") })
    );
    return () => {
      cancelled = true;
    };
  }, [dimension, rangeDays, key, t]);

  const current = result?.key === key ? result : null;
  const loading = current === null;
  const breakdown = current?.breakdown ?? null;
  const error = current?.error ?? null;

  return (
    <PanelShell
      title={t("breakdown.title")}
      loading={loading}
      error={error}
      empty={!!breakdown && breakdown.slices.length === 0}
      emptyLabel={t("panels.noOrdersInRange")}
      action={
        <div className="flex gap-1 rounded-[var(--radius-s)] border border-line p-0.5">
          {DIMENSIONS.map((d) => (
            <button
              key={d}
              onClick={() => setDimension(d)}
              className={`rounded-[var(--radius-xs)] px-2.5 py-1 text-xs font-medium transition ${
                dimension === d ? "bg-ink text-ink-inverse" : "text-ink-muted hover:bg-surface-sunken"
              }`}
            >
              {t(`breakdown.${d}`)}
            </button>
          ))}
        </div>
      }
    >
      {breakdown && <DonutBreakdown slices={breakdown.slices} />}
    </PanelShell>
  );
}
