"use client";

import { useState } from "react";
import { api } from "@/lib/apiClient";
import Button from "@/components/ui/button/Button";
import { LogisticsQuoteForm } from "./LogisticsQuoteForm";
import { LocationUpdateForm } from "./LocationUpdateForm";
import { Order, PARTNER_NEXT_ACTION_LABELS, PARTNER_NEXT_STATUS, PARTNER_SEQUENCE } from "@/lib/types";

const QUOTING_PHASE = new Set(["QUOTING", "QUOTED"]);

export function OrderPartnerPanel({ order, onChanged }: { order: Order; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nextStatus = PARTNER_NEXT_STATUS[order.status];

  async function advance() {
    if (!nextStatus) return;
    setBusy(true);
    setError(null);
    try {
      await api.post(`/orders/${order.id}/transition`, { toStatus: nextStatus });
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action impossible");
    } finally {
      setBusy(false);
    }
  }

  if (QUOTING_PHASE.has(order.status)) {
    return <LogisticsQuoteForm order={order} onChanged={onChanged} />;
  }

  if (order.status === "QUOTE_SENT" || order.status === "PAID" || order.status === "PURCHASED" || order.status === "RECEIVED_HUB") {
    return <p className="text-sm text-ink-muted">En attente de confirmation de prise en charge par le hub.</p>;
  }

  if (nextStatus) {
    return (
      <div className="space-y-4">
        {PARTNER_SEQUENCE.includes(order.status) && (
          <LocationUpdateForm order={order} onChanged={onChanged} />
        )}
        <div className="space-y-2 border-t border-line pt-3">
          {error && <p className="text-xs text-critical">{error}</p>}
          <Button block onClick={advance} loading={busy}>
            {PARTNER_NEXT_ACTION_LABELS[order.status]}
          </Button>
        </div>
      </div>
    );
  }

  if (order.status === "DELIVERED") {
    return (
      <div className="space-y-4">
        <LocationUpdateForm order={order} onChanged={onChanged} />
        <p className="text-sm text-ink-muted">Livré.</p>
      </div>
    );
  }

  return <p className="text-sm text-ink-muted">Livré.</p>;
}
