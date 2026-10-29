"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { api } from "@/lib/apiClient";
import Button from "@/components/ui/button/Button";
import { LogisticsQuoteLineItem, Order } from "@/lib/types";
import { useFormat } from "@/lib/format";

const inputClasses =
  "h-10 w-full rounded-[var(--radius-s)] border border-line-strong bg-surface-raised px-3 text-sm text-ink placeholder:text-ink-muted focus:outline-2 focus:outline-offset-2 focus:outline-focus-ring";

export function LogisticsQuoteForm({ order, onChanged }: { order: Order; onChanged: () => void }) {
  const t = useTranslations("orders.quote");
  const f = useFormat();
  const existing = order.logisticsQuote;
  const [lineItems, setLineItems] = useState<LogisticsQuoteLineItem[]>(
    existing?.lineItems ?? [
      { label: t("defaultTransport"), amount: 0 },
      { label: t("defaultHandling"), amount: 0 },
    ]
  );
  const [currency, setCurrency] = useState(existing?.currency ?? order.hub.currency);
  const [note, setNote] = useState(existing?.note ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = lineItems.reduce((sum, li) => sum + (Number(li.amount) || 0), 0);

  function updateItem(index: number, patch: Partial<LogisticsQuoteLineItem>) {
    setLineItems((items) => items.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  function addItem() {
    setLineItems((items) => [...items, { label: "", amount: 0 }]);
  }

  function removeItem(index: number) {
    setLineItems((items) => items.filter((_, i) => i !== index));
  }

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await api.post(`/orders/${order.id}/logistics-quote`, {
        amount: total,
        currency,
        lineItems: lineItems.filter((li) => li.label.trim()),
        note: note || undefined,
      });
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="rb-overline">
        {existing ? t("titleEdit") : t("title")}
      </p>
      {existing?.fromRateCard && <p className="text-[13px] text-ink-muted">{t("fromRateCard")}</p>}
      <div className="space-y-2">
        {lineItems.map((li, i) => (
          <div key={i} className="flex gap-2">
            <input
              value={li.label}
              onChange={(e) => updateItem(i, { label: e.target.value })}
              placeholder={t("lineLabel")}
              aria-label={t("lineLabel")}
              className={`min-w-0 flex-1 ${inputClasses}`}
            />
            <input
              type="number"
              min="0"
              value={li.amount || ""}
              onChange={(e) => updateItem(i, { amount: Number(e.target.value) })}
              placeholder={t("lineAmount")}
              aria-label={t("lineAmount")}
              className={`${inputClasses} w-28! flex-none tabular-nums`}
            />
            <Button type="button" variant="secondary" size="s" onClick={() => removeItem(i)} aria-label={t("removeLine")}>
              ✕
            </Button>
          </div>
        ))}
      </div>
      <button type="button" onClick={addItem} className="rb-link text-xs font-medium">
        {t("addLine")}
      </button>

      <div className="flex items-center gap-2">
        <input value={currency} onChange={(e) => setCurrency(e.target.value)} aria-label={t("currency")} className={`${inputClasses} w-20! flex-none uppercase`} />
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("note")} aria-label={t("note")} className={`min-w-0 flex-1 ${inputClasses}`} />
      </div>

      <div className="flex items-center justify-between rounded-[var(--radius-s)] bg-surface-sunken px-3 py-2 text-sm">
        <span className="text-ink-muted">{t("total")}</span>
        <span className="font-semibold text-ink">
          {f.money(total, currency)}
        </span>
      </div>

      {error && <p className="text-xs text-critical">{error}</p>}

      <Button block onClick={submit} disabled={total <= 0} loading={busy}>
        {existing ? t("update") : t("send")}
      </Button>
    </div>
  );
}
