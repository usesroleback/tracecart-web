"use client";

import { useState } from "react";
import { api } from "@/lib/apiClient";
import Button from "@/components/ui/button/Button";
import { LogisticsQuoteLineItem, Order } from "@/lib/types";

const inputClasses =
  "h-10 w-full rounded-[var(--radius-s)] border border-line-strong bg-surface-raised px-3 text-sm text-ink placeholder:text-ink-muted focus:outline-2 focus:outline-offset-2 focus:outline-focus-ring";

export function LogisticsQuoteForm({ order, onChanged }: { order: Order; onChanged: () => void }) {
  const existing = order.logisticsQuote;
  const [lineItems, setLineItems] = useState<LogisticsQuoteLineItem[]>(
    existing?.lineItems ?? [
      { label: "Transport", amount: 0 },
      { label: "Manutention", amount: 0 },
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
      setError(err instanceof Error ? err.message : "Impossible d'envoyer la cotation");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="rb-overline">
        {existing ? "Cotation logistique (modifier)" : "Cotation logistique"}
      </p>
      <div className="space-y-2">
        {lineItems.map((li, i) => (
          <div key={i} className="flex gap-2">
            <input
              value={li.label}
              onChange={(e) => updateItem(i, { label: e.target.value })}
              placeholder="Libellé (ex. Transport)"
              className={`flex-1 ${inputClasses}`}
            />
            <input
              type="number"
              min="0"
              value={li.amount || ""}
              onChange={(e) => updateItem(i, { amount: Number(e.target.value) })}
              placeholder="Montant"
              className={`w-28 ${inputClasses}`}
            />
            <Button type="button" variant="secondary" size="s" onClick={() => removeItem(i)}>
              ✕
            </Button>
          </div>
        ))}
      </div>
      <button type="button" onClick={addItem} className="text-xs font-medium text-accent-ink hover:underline">
        + Ajouter une ligne
      </button>

      <div className="flex items-center gap-2">
        <input value={currency} onChange={(e) => setCurrency(e.target.value)} className={`w-20 flex-shrink-0 ${inputClasses}`} />
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optionnel)" className={inputClasses} />
      </div>

      <div className="flex items-center justify-between rounded-[var(--radius-s)] bg-surface-sunken px-3 py-2 text-sm">
        <span className="text-ink-muted">Total</span>
        <span className="font-semibold text-ink">
          {total.toLocaleString("fr-FR")} {currency}
        </span>
      </div>

      {error && <p className="text-xs text-critical">{error}</p>}

      <Button block onClick={submit} disabled={total <= 0} loading={busy}>
        {existing ? "Mettre à jour la cotation" : "Envoyer la cotation"}
      </Button>
    </div>
  );
}
