"use client";

import { QuotingDesk } from "./QuotingDesk";
import { FulfillmentPanel } from "./FulfillmentPanel";
import { ManualTransitionForm } from "./ManualTransitionForm";
import { LocationTimeline } from "./LocationTimeline";
import { Order, PARTNER_SEQUENCE } from "@/lib/types";

const QUOTING_PHASE = new Set(["QUOTING", "QUOTED", "QUOTE_SENT"]);
const FULFILLMENT_PHASE = new Set(["PAID", "PURCHASED", "RECEIVED_HUB", "CONFIRMED_HUB", "PICKED_UP", "IN_TRANSIT", "DELIVERED"]);

export function OrderAdminPanel({ order, onChanged }: { order: Order; onChanged: () => void }) {
  return (
    <div className="space-y-4">
      {QUOTING_PHASE.has(order.status) && <QuotingDesk order={order} onChanged={onChanged} />}
      {FULFILLMENT_PHASE.has(order.status) && <FulfillmentPanel order={order} onChanged={onChanged} />}
      {PARTNER_SEQUENCE.includes(order.status) && (
        <div>
          <p className="rb-overline mb-1.5">Où est le colis</p>
          <LocationTimeline updates={order.locationUpdates} />
        </div>
      )}
      {(order.status === "DECLINED" || order.status === "UNAVAILABLE") && (
        <p className="text-sm text-ink-muted">Commande close.</p>
      )}
      <div className="border-t border-line pt-3">
        <ManualTransitionForm order={order} onChanged={onChanged} />
      </div>
    </div>
  );
}
