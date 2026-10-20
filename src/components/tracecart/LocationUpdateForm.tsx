"use client";

import { FormEvent, useState } from "react";
import { useTranslations } from "next-intl";
import { api } from "@/lib/apiClient";
import Button from "@/components/ui/button/Button";
import { LocationTimeline } from "./LocationTimeline";
import { Order } from "@/lib/types";

const inputClasses =
  "h-10 w-full rounded-[var(--radius-s)] border border-line-strong bg-surface-raised px-3 text-sm text-ink placeholder:text-ink-muted focus:outline-2 focus:outline-offset-2 focus:outline-focus-ring";

/** Partner-facing: report where the shipment currently is, and see the history of past reports. */
export function LocationUpdateForm({ order, onChanged }: { order: Order; onChanged: () => void }) {
  const t = useTranslations("orders.location");
  const [city, setCity] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!city.trim() && !note.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.post(`/orders/${order.id}/location-updates`, {
        city: city.trim() || undefined,
        note: note.trim() || undefined,
      });
      setCity("");
      setNote("");
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("failed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="@container space-y-3">
      <p className="rb-overline">{t("title")}</p>
      <LocationTimeline updates={order.locationUpdates} />
      <form onSubmit={handleSubmit} className="flex flex-col gap-2 @md:flex-row">
        <input value={city} onChange={(e) => setCity(e.target.value)} aria-label={t("city")} placeholder={t("cityPlaceholder")} className={`flex-1 ${inputClasses}`} />
        <input value={note} onChange={(e) => setNote(e.target.value)} aria-label={t("note")} placeholder={t("note")} className={`flex-1 ${inputClasses}`} />
        <Button type="submit" size="s" loading={submitting} disabled={!city.trim() && !note.trim()}>
          {t("report")}
        </Button>
      </form>
      {error && <p className="text-xs text-critical">{error}</p>}
    </div>
  );
}
