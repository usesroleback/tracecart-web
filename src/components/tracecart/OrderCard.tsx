"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CorridorTracker } from "./CorridorTracker";
import { ProviderBadge } from "./ProviderBadge";
import { OrderStatusTag } from "@/components/ui/status/Status";
import { Badge } from "@/components/ui/badge/Badge";
import { Card } from "@/components/ui/card/Card";
import { productPlaceholder } from "@/lib/placeholderImage";
import { Order } from "@/lib/types";
import { useFormat } from "@/lib/format";

export function OrderCard({ order, children }: { order: Order; children?: React.ReactNode }) {
  const t = useTranslations("orders");
  const f = useFormat();
  const [expanded, setExpanded] = useState(false);
  const thumbnail = order.photos[0]?.url
    ? `/api/tracecart${order.photos[0].url}`
    : order.productImageUrl || productPlaceholder(order.id);

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={thumbnail}
            alt=""
            className="h-14 w-14 flex-shrink-0 rounded-[var(--radius-s)] border border-line object-cover"
          />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Link href={`/orders/${order.id}`} className="rb-mono rb-link">
                {order.reference}
              </Link>
              {order.intakeType === "CUSTOMER_OWNED" ? <Badge>{t("source.customerOwned")}</Badge> : <ProviderBadge provider={order.provider} />}
              <OrderStatusTag status={order.status} />
              {order.status === "QUOTE_SENT" && order.quoteAcceptedAt && (
                <Badge variant="positive">{t("table.acceptedByCustomer")}</Badge>
              )}
            </div>
            <p className="mt-1 text-sm font-medium text-ink">
              {order.productName} {order.quantity > 1 ? `× ${f.number(order.quantity)}` : ""}
            </p>
            <p className="text-xs text-ink-muted">
              {order.customerName} · {order.customerPhone}
            </p>
          </div>
        </div>
        {order.customerQuoteTotal != null && (
          <div className="whitespace-nowrap text-right text-sm font-semibold text-ink">
            {f.money(order.customerQuoteTotal, order.currency ?? order.hub.currency)}
          </div>
        )}
      </div>

      <div className="mt-4">
        <CorridorTracker status={order.status} hubCity={order.hub.city} destinationCity={order.destinationCity} />
      </div>

      {children && (
        <>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="rb-link mt-3 text-xs font-medium"
          >
            {expanded ? t("card.hideDetails") : t("card.showDetails")}
          </button>
          {expanded && <div className="mt-3 border-t border-line pt-3">{children}</div>}
        </>
      )}
    </Card>
  );
}
