"use client";

import { useTranslations } from "next-intl";
import { QuotingDesk } from "./QuotingDesk";
import { FulfillmentPanel } from "./FulfillmentPanel";
import { ManualTransitionForm } from "./ManualTransitionForm";
import { LocationTimeline } from "./LocationTimeline";
import { Order, PARTNER_SEQUENCE } from "@/lib/types";
import { useSession } from "@/context/SessionContext";

const QUOTING_PHASE = new Set(["QUOTING", "QUOTED", "QUOTE_SENT"]);
const FULFILLMENT_PHASE = new Set(["PAID", "PURCHASED", "RECEIVED_HUB", "CONFIRMED_HUB", "PICKED_UP", "IN_TRANSIT", "DELIVERED"]);

/** showLocations: off where the page already lists positions (orders/[id]). */
export function OrderAdminPanel({
  order,
  onChanged,
  showLocations = true,
}: {
  order: Order;
  onChanged: () => void;
  showLocations?: boolean;
}) {
  const t = useTranslations("orders");
  const user = useSession();
  const canQuote = !!user.permissions?.includes("orders.quote.write") || !!user.permissions?.includes("orders.quote.send");
  return (
    <div className="space-y-4">
      {QUOTING_PHASE.has(order.status) && canQuote ? <QuotingDesk order={order} onChanged={onChanged} /> : null}
      {FULFILLMENT_PHASE.has(order.status) && <FulfillmentPanel order={order} onChanged={onChanged} />}
      {showLocations && PARTNER_SEQUENCE.includes(order.status) && (
        <div>
          <p className="rb-overline mb-1.5">{t("location.title")}</p>
          <LocationTimeline updates={order.locationUpdates} />
        </div>
      )}
      {(order.status === "DECLINED" || order.status === "UNAVAILABLE") && (
        <p className="text-sm text-ink-muted">{t("closed")}</p>
      )}
      <div className="border-t border-line pt-3">
        <ManualTransitionForm order={order} onChanged={onChanged} />
      </div>
    </div>
  );
}
