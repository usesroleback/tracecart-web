"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { api } from "@/lib/apiClient";
import { OrdersTable, logisticsAmount } from "@/components/tracecart/OrdersTable";
import { OrderPartnerPanel } from "@/components/tracecart/OrderPartnerPanel";
import { QueueDepthPanel } from "@/components/tracecart/QueueDepthPanel";
import { Badge } from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { Card } from "@/components/ui/card/Card";
import { ExceptionCard } from "@/components/ui/exception-card/ExceptionCard";
import { KpiStrip } from "@/components/ui/kpi-strip/KpiStrip";
import { SegmentedTabs } from "@/components/ui/tabs/Tabs";
import { fetchStatusCounts } from "@/lib/kpi/adapter";
import { ORDERS_PAGE_LIMIT } from "@/lib/ordersQuery";
import { Notification, Order, OrderStatus, Paginated } from "@/lib/types";

type Segment = "all" | "quote" | "waiting" | "ready" | "moving" | "delivered";

// The partner's side of the lifecycle: quote it, wait for the hub, collect
// it, drive it, deliver it. Declined/unavailable orders fall under "all" only.
const SEGMENT_STATUSES: Record<Exclude<Segment, "all">, OrderStatus[]> = {
  quote: ["QUOTING", "QUOTED"],
  waiting: ["INTENT_SUBMITTED", "QUOTE_SENT", "PAID", "PURCHASED", "RECEIVED_HUB"],
  ready: ["CONFIRMED_HUB"],
  moving: ["PICKED_UP", "IN_TRANSIT"],
  delivered: ["DELIVERED"],
};

const SEGMENT_LABELS: Record<Segment, string> = {
  all: "Tous",
  quote: "À coter",
  waiting: "En attente du hub",
  ready: "À gérer",
  moving: "En route",
  delivered: "Livrés",
};

const inSegment = (status: OrderStatus, segment: Segment) =>
  segment === "all" || SEGMENT_STATUSES[segment].includes(status);

const sumOf = (counts: Partial<Record<OrderStatus, number>>, statuses: OrderStatus[]) =>
  statuses.reduce((n, s) => n + (counts[s] ?? 0), 0);

/**
 * The logistics partner's console, on the TraceCartOps layout: what needs a
 * quote or a pickup surfaces first in the right column; the table carries
 * the partner's own logistics quote, never the customer's total.
 */
export function DeliveriesDashboard({ initialOrders, initialTotal }: { initialOrders: Order[]; initialTotal: number }) {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [total, setTotal] = useState(initialTotal);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [counts, setCounts] = useState<Partial<Record<OrderStatus, number>>>({});
  // The selected tab lives in the URL (?etape=), so the sidebar can link
  // straight to a step and back/forward and shared links keep it.
  const router = useRouter();
  const tab = useSearchParams().get("etape");
  const segment: Segment = tab && tab in SEGMENT_LABELS ? (tab as Segment) : "all";
  const setSegment = (id: Segment) =>
    router.replace({ pathname: "/deliveries", query: id === "all" ? {} : { etape: id } }, { scroll: false });
  const [openId, setOpenId] = useState<string | null>(null);
  // True from the start: the first load begins as soon as the page mounts.
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [result, notifs, statusCounts] = await Promise.all([
        api.get<{ items: Order[]; total: number }>(`/orders?limit=${ORDERS_PAGE_LIMIT}`),
        api.get<Paginated<Notification>>("/notifications?limit=5"),
        fetchStatusCounts(),
      ]);
      setOrders(result.items);
      setTotal(result.total);
      setNotifications(notifs.items);
      setCounts(statusCounts);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function refresh() {
    setLoading(true);
    await load();
  }

  const visible = orders.filter((o) => inSegment(o.status, segment));
  const toQuote = orders.filter((o) => inSegment(o.status, "quote"));
  const toCollect = orders.filter((o) => inSegment(o.status, "ready"));
  const inApp = notifications.filter((n) => n.channel === "IN_APP");

  return (
    <div>
      <div>
        <h1 className="rb-headline text-[32px]">Livraisons</h1>
        <p className="mt-1 text-sm text-ink-muted">Demandes de cotation et colis confirmés, prêts à prendre la route.</p>
      </div>

      <KpiStrip
        className="mt-6"
        items={[
          { key: "quote", value: sumOf(counts, SEGMENT_STATUSES.quote), label: "À coter" },
          { key: "waiting", value: sumOf(counts, SEGMENT_STATUSES.waiting), label: "En attente du hub" },
          { key: "ready", value: sumOf(counts, SEGMENT_STATUSES.ready), label: "À gérer" },
          { key: "moving", value: sumOf(counts, SEGMENT_STATUSES.moving), label: "En route" },
          { key: "delivered", value: sumOf(counts, SEGMENT_STATUSES.delivered), label: "Livrés" },
        ]}
      />

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">
          <SegmentedTabs
            label="Étape"
            className="mb-3"
            value={segment}
            onChange={setSegment}
            tabs={(Object.keys(SEGMENT_LABELS) as Segment[]).map((id) => ({
              id,
              label: SEGMENT_LABELS[id],
              count: orders.filter((o) => inSegment(o.status, id)).length,
            }))}
          />

          {loading && orders.length === 0 && <p className="text-sm text-ink-muted">Chargement des livraisons...</p>}
          {!loading && orders.length === 0 && <p className="text-sm text-ink-muted">Aucun colis assigné pour le moment.</p>}
          {orders.length > 0 && visible.length === 0 && (
            <p className="text-sm text-ink-muted">Aucun colis « {SEGMENT_LABELS[segment].toLowerCase()} » pour le moment.</p>
          )}
          {visible.length > 0 && (
            <OrdersTable
              caption={`Livraisons — ${SEGMENT_LABELS[segment]}`}
              orders={visible}
              openId={openId}
              onToggle={(id) => setOpenId((cur) => (cur === id ? null : id))}
              amountOf={logisticsAmount}
              amountLabel="Votre devis"
              renderDetail={(order) => <OrderPartnerPanel order={order} onChanged={refresh} />}
            />
          )}
          {total > orders.length && (
            <p className="mt-3 text-[13px] text-ink-muted">
              Les {orders.length} colis les plus récents sur {total}.
            </p>
          )}
        </div>

        <aside className="grid content-start gap-3" aria-label="À faire">
          <div className="flex items-center justify-between">
            <h2 className="rb-title">À faire</h2>
            {toQuote.length + toCollect.length > 0 && <Badge variant="attn">{toQuote.length + toCollect.length}</Badge>}
          </div>
          {toQuote.length + toCollect.length === 0 ? (
            <p className="text-sm text-ink-muted">Rien à coter ni à gérer pour le moment.</p>
          ) : (
            <>
              {toQuote.map((order) => (
                <ExceptionCard
                  key={order.id}
                  severity="held"
                  title={`Cotation attendue · ${order.productName}`}
                  meta={`${order.reference} · ${order.hub.city} → ${order.destinationCity}`}
                  actions={
                    <Button size="s" variant="secondary" href={`/orders/${order.id}`}>
                      Coter
                    </Button>
                  }
                >
                  Quantité {order.quantity.toLocaleString("fr-FR")}.
                </ExceptionCard>
              ))}
              {toCollect.map((order) => (
                <ExceptionCard
                  key={order.id}
                  severity="held"
                  title={`Prêt au hub · ${order.productName}`}
                  meta={`${order.reference} · ${order.hub.city} → ${order.destinationCity}`}
                  actions={
                    <Button size="s" variant="secondary" href={`/orders/${order.id}`}>
                      Ouvrir
                    </Button>
                  }
                >
                  Le hub a confirmé le colis : il attend votre prise en charge.
                </ExceptionCard>
              ))}
            </>
          )}

          {inApp.length > 0 && (
            <Card className="mt-3">
              <h2 className="rb-title text-[16px]">Dernières notifications</h2>
              <ul className="mt-3 grid gap-3">
                {inApp.map((n) => (
                  <li key={n.id} className="text-sm">
                    <span className="block font-medium text-ink">{n.title}</span>
                    <span className="text-ink-muted">{n.body}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <div className="mt-3">
            <QueueDepthPanel />
          </div>
        </aside>
      </div>
    </div>
  );
}
