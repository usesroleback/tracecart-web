"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { api } from "@/lib/apiClient";
import Button from "@/components/ui/button/Button";
import { ADMIN_MANUAL_TARGETS, Order, OrderStatus } from "@/lib/types";

const inputClasses =
  "h-10 w-full rounded-[var(--radius-s)] border border-line-strong bg-surface-raised px-3 text-sm text-ink focus:outline-2 focus:outline-offset-2 focus:outline-focus-ring";

/** Free-form manual status change, available to the admin at any phase — every change requires a note and is audit-logged. */
export function ManualTransitionForm({ order, onChanged }: { order: Order; onChanged: () => void }) {
  const t = useTranslations("orders");
  const ts = useTranslations("labels.status");
  // Nothing for TraceCart to purchase on a CUSTOMER_OWNED order.
  const targets =
    order.intakeType === "CUSTOMER_OWNED" ? ADMIN_MANUAL_TARGETS.filter((s) => s !== "PURCHASED") : ADMIN_MANUAL_TARGETS;
  const [open, setOpen] = useState(false);
  const [toStatus, setToStatus] = useState<OrderStatus>(targets[0]);
  const [note, setNote] = useState("");
  const [override, setOverride] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await api.post(`/orders/${order.id}/transition`, { toStatus, note, override: override || undefined });
      setNote("");
      setOpen(false);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("manual.failed"));
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs font-medium text-ink-muted hover:underline"
      >
        {t("manual.open")}
      </button>
    );
  }

  return (
    <div className="rounded-[var(--radius-s)] border border-line p-3">
      <p className="rb-overline mb-2">{t("manual.title")}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <select value={toStatus} onChange={(e) => setToStatus(e.target.value as OrderStatus)} className={inputClasses}>
          {targets.map((s) => (
            <option key={s} value={s}>
              {ts(s)}
            </option>
          ))}
        </select>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("manual.note")} className={inputClasses} />
      </div>
      {toStatus === "PURCHASED" && (
        <label className="mt-2 flex items-center gap-2 text-xs text-ink">
          <input type="checkbox" checked={override} onChange={(e) => setOverride(e.target.checked)} />
          {t("manual.override")}
        </label>
      )}
      {error && <p className="mt-2 text-xs text-critical">{error}</p>}
      <div className="mt-2 flex justify-end gap-2">
        <Button variant="secondary" size="s" onClick={() => setOpen(false)}>
          {t("cancel")}
        </Button>
        <Button size="s" onClick={submit} disabled={!note.trim()} loading={busy}>
          {t("manual.apply")}
        </Button>
      </div>
    </div>
  );
}
