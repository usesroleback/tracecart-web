"use client";

import { useEffect, useState } from "react";
import { PanelShell } from "./PanelShell";
import { fetchQueueDepth } from "@/lib/kpi/adapter";
import { QueueStage } from "@/lib/kpi/types";
import { STATUS_LABELS } from "@/lib/types";

const PHASE_BAR: Record<QueueStage["phase"], string> = {
  origin: "bg-ink",
  handoff: "bg-handoff-500",
  transit: "bg-transit-500",
};

export function QueueDepthPanel() {
  const [stages, setStages] = useState<QueueStage[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchQueueDepth()
      .then((data) => {
        if (!cancelled) setStages(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Impossible de charger les files d'attente");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const maxCount = stages ? Math.max(1, ...stages.map((s) => s.count)) : 1;

  return (
    <PanelShell
      title="Où ça bloque"
      loading={loading}
      error={error}
      empty={!!stages && stages.length === 0}
      emptyLabel="Aucune commande en cours."
    >
      <div className="space-y-3">
        {stages?.map((stage) => (
          <div key={stage.status}>
            <div className="mb-1 flex items-center justify-between gap-2 text-xs">
              <span className="font-medium text-ink">{STATUS_LABELS[stage.status]}</span>
              <span className="flex items-center gap-1.5 text-ink-muted">
                {stage.isBottleneck && (
                  <span className="text-attn" title="Ce stade prend plus de temps que d'habitude">
                    ⚠
                  </span>
                )}
                {stage.count} · moy. {stage.avgAgeHours.toLocaleString("fr-FR")} h · p90 {stage.p90AgeHours.toLocaleString("fr-FR")} h
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-surface-sunken">
              <div
                className={`h-full rounded-full ${PHASE_BAR[stage.phase]} ${stage.isBottleneck ? "opacity-100" : "opacity-70"}`}
                style={{ width: `${Math.max(6, (stage.count / maxCount) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </PanelShell>
  );
}
