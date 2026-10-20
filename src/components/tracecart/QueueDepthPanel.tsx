"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { PanelShell } from "./PanelShell";
import { fetchQueueDepth } from "@/lib/kpi/adapter";
import { QueueStage } from "@/lib/kpi/types";
import { STATUS_SEQUENCE } from "@/lib/types";
import { useFormat } from "@/lib/format";

/**
 * How long open orders have been sitting at each stage, in the brand's
 * "plain words, real numbers" voice: "2 commandes · 24,6 h en moyenne",
 * plus "9 sur 10 sous 31 h" when the spread is wide enough to matter. Bars
 * measure time (the longest average is the full width), in ink; a stage
 * slower than usual turns Signal Yellow and says so in words, never by
 * colour alone. Stages follow the order lifecycle.
 */
export function QueueDepthPanel() {
  const t = useTranslations("dashboard.queue");
  const tl = useTranslations("labels");
  const f = useFormat();
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
        if (!cancelled) setError(err instanceof Error ? err.message : t("failed"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  const ordered = stages ? [...stages].sort((a, b) => STATUS_SEQUENCE.indexOf(a.status) - STATUS_SEQUENCE.indexOf(b.status)) : null;
  const longest = ordered ? Math.max(1, ...ordered.map((s) => s.avgAgeHours)) : 1;

  return (
    <PanelShell
      title={t("title")}
      loading={loading}
      error={error}
      empty={!!ordered && ordered.length === 0}
      emptyLabel={t("empty")}
    >
      <p className="-mt-2 mb-4 text-[13px] text-ink-muted">{t("subtitle")}</p>
      <ol className="grid gap-3.5">
        {ordered?.map((stage) => (
          <li key={stage.status}>
            <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-sm">
              <span className="font-semibold text-ink">
                {tl(`status.${stage.status}`)}
                {stage.isBottleneck && (
                  <span className="ml-2 rounded-[var(--radius-xs)] bg-attn-soft px-1.5 py-0.5 text-[12px] font-semibold text-attn">
                    {t("slower")}
                  </span>
                )}
              </span>
              <span className="tabular-nums text-ink-muted">
                <b className="font-semibold text-ink">{tl("orderCount", { count: stage.count })}</b> ·{" "}
                {t("average", { hours: f.hours(stage.avgAgeHours) })}
                {/* The spread only says something when it differs from the average. */}
                {stage.p90AgeHours > stage.avgAgeHours * 1.1 && ` · ${t("p90", { hours: f.hours(stage.p90AgeHours) })}`}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-[var(--radius-xs)] bg-surface-sunken" aria-hidden>
              <div
                className={`h-full rounded-[var(--radius-xs)] ${stage.isBottleneck ? "bg-signal" : "bg-ink"}`}
                style={{ width: `${Math.max(4, (stage.avgAgeHours / longest) * 100)}%` }}
              />
            </div>
          </li>
        ))}
      </ol>
    </PanelShell>
  );
}
