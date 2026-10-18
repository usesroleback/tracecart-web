"use client";

import { useState } from "react";
import { api } from "@/lib/apiClient";
import Button from "@/components/ui/button/Button";
import { Order, OrderStatus } from "@/lib/types";

const STEP_BUY_ON_BEHALF: Partial<Record<OrderStatus, { toStatus: OrderStatus; label: string }>> = {
  PAID: { toStatus: "PURCHASED", label: "Marquer acheté" },
  PURCHASED: { toStatus: "RECEIVED_HUB", label: "Marquer reçu au hub" },
  RECEIVED_HUB: { toStatus: "CONFIRMED_HUB", label: "Confirmer et transmettre au partenaire" },
};

// No purchase for TraceCart to make — the customer already owns the goods,
// so PAID (for the shipping) goes straight to RECEIVED_HUB.
const STEP_CUSTOMER_OWNED: Partial<Record<OrderStatus, { toStatus: OrderStatus; label: string }>> = {
  PAID: { toStatus: "RECEIVED_HUB", label: "Marquer reçu au hub" },
  RECEIVED_HUB: { toStatus: "CONFIRMED_HUB", label: "Confirmer et transmettre au partenaire" },
};

export function FulfillmentPanel({ order, onChanged }: { order: Order; onChanged: () => void }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const step = (order.intakeType === "CUSTOMER_OWNED" ? STEP_CUSTOMER_OWNED : STEP_BUY_ON_BEHALF)[order.status];

  if (!step) {
    return (
      <p className="text-sm text-ink-muted">
        {order.status === "PICKED_UP" || order.status === "IN_TRANSIT"
          ? "En cours de livraison par le partenaire."
          : order.status === "DELIVERED"
            ? "Livré."
            : null}
      </p>
    );
  }

  async function advance() {
    setBusy(true);
    setError(null);
    try {
      await api.post(`/orders/${order.id}/transition`, { toStatus: step!.toStatus, note });
      setNote("");
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action impossible");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Note (obligatoire)"
        className="h-10 w-full rounded-[var(--radius-s)] border border-line-strong bg-surface-raised px-3 text-sm text-ink focus:outline-2 focus:outline-offset-2 focus:outline-focus-ring"
      />
      {error && <p className="text-xs text-critical">{error}</p>}
      {step.toStatus === "CONFIRMED_HUB" ? (
        <button
          onClick={advance}
          disabled={busy || !note.trim()}
          className="w-full rounded-[var(--radius-s)] bg-signal py-2 text-sm font-semibold text-black transition hover:opacity-90 disabled:opacity-60"
        >
          {busy ? "Mise à jour..." : step.label}
        </button>
      ) : (
        <Button block onClick={advance} disabled={!note.trim()} loading={busy}>
          {step.label}
        </Button>
      )}
    </div>
  );
}
