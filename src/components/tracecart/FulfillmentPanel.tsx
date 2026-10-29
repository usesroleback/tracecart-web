"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { api } from "@/lib/apiClient";
import Button from "@/components/ui/button/Button";
import { Order, OrderStatus } from "@/lib/types";

// Labels are orders.fulfil.*.
type Step = { toStatus: OrderStatus; label: "markPurchased" | "markReceived" | "confirm" };

const STEP_BUY_ON_BEHALF: Partial<Record<OrderStatus, Step>> = {
  PAID: { toStatus: "PURCHASED", label: "markPurchased" },
  PURCHASED: { toStatus: "RECEIVED_HUB", label: "markReceived" },
  RECEIVED_HUB: { toStatus: "CONFIRMED_HUB", label: "confirm" },
};

// No purchase for Tracecart to make — the customer already owns the goods,
// so PAID (for the shipping) goes straight to RECEIVED_HUB.
const STEP_CUSTOMER_OWNED: Partial<Record<OrderStatus, Step>> = {
  PAID: { toStatus: "RECEIVED_HUB", label: "markReceived" },
  RECEIVED_HUB: { toStatus: "CONFIRMED_HUB", label: "confirm" },
};

export function FulfillmentPanel({ order, onChanged }: { order: Order; onChanged: () => void }) {
  const t = useTranslations("orders");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const step = (order.intakeType === "CUSTOMER_OWNED" ? STEP_CUSTOMER_OWNED : STEP_BUY_ON_BEHALF)[order.status];

  if (!step) {
    return (
      <p className="text-sm text-ink-muted">
        {order.status === "PICKED_UP" || order.status === "IN_TRANSIT"
          ? t("fulfil.delivering")
          : order.status === "DELIVERED"
            ? t("fulfil.delivered")
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
      setError(err instanceof Error ? err.message : t("actionFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={t("manual.note")}
        aria-label={t("manual.note")}
        className="h-10 w-full rounded-[var(--radius-s)] border border-line-strong bg-surface-raised px-3 text-sm text-ink focus:outline-2 focus:outline-offset-2 focus:outline-focus-ring"
      />
      {error && <p className="text-xs text-critical">{error}</p>}
      {step.toStatus === "CONFIRMED_HUB" ? (
        <button
          onClick={advance}
          disabled={busy || !note.trim()}
          className="w-full rounded-[var(--radius-s)] bg-signal py-2 text-sm font-semibold text-black transition hover:opacity-90 disabled:opacity-60"
        >
          {busy ? t("fulfil.updating") : t(`fulfil.${step.label}`)}
        </button>
      ) : (
        <Button block onClick={advance} disabled={!note.trim()} loading={busy}>
          {t(`fulfil.${step.label}`)}
        </Button>
      )}
    </div>
  );
}
