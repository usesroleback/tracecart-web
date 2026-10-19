"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/apiClient";
import { OrderCard } from "@/components/tracecart/OrderCard";
import { OrderPartnerPanel } from "@/components/tracecart/OrderPartnerPanel";
import { QueueDepthPanel } from "@/components/tracecart/QueueDepthPanel";
import { Card } from "@/components/ui/card/Card";
import { fetchStatusCounts } from "@/lib/kpi/adapter";
import { Notification, Order, OrderStatus, Paginated, STATUS_LABELS } from "@/lib/types";

const PARTNER_STAGES = ["QUOTING", "CONFIRMED_HUB", "PICKED_UP", "IN_TRANSIT", "DELIVERED"] as const;

export function DeliveriesDashboard({ initialOrders }: { initialOrders: Order[] }) {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [counts, setCounts] = useState<Partial<Record<OrderStatus, number>>>({});
  const [loading, setLoading] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const [result, notifs, statusCounts] = await Promise.all([
        api.get<{ items: Order[] }>("/orders"),
        api.get<Paginated<Notification>>("/notifications?limit=5"),
        fetchStatusCounts(),
      ]);
      setOrders(result.items);
      setNotifications(notifs.items);
      setCounts(statusCounts);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div className="mb-6">
        <h1 className="sq-headline text-[32px]">Livraisons</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Demandes de cotation et colis confirmés, prêts à prendre la route.
        </p>
      </div>

      <div className="mb-6 grid grid-cols-3 border-t-[var(--border-strong)] border-b border-t-ink border-b-line sm:grid-cols-5">
        {PARTNER_STAGES.map((status, i) => (
          <div key={status} className={`py-4 pr-3 ${i > 0 ? "border-l border-line pl-3" : ""}`}>
            <p className="sq-numeral-l text-[28px]">{counts[status] ?? 0}</p>
            <p className="mt-1 text-[12px] text-ink-muted">{STATUS_LABELS[status]}</p>
          </div>
        ))}
      </div>

      <div className="mb-6">
        <QueueDepthPanel />
      </div>

      {notifications.filter((n) => n.channel === "IN_APP").length > 0 && (
        <Card className="mb-6">
          <h2 className="sq-title text-[14px] mb-3">Dernières notifications</h2>
          <ul className="space-y-2">
            {notifications
              .filter((n) => n.channel === "IN_APP")
              .map((n) => (
                <li key={n.id} className="text-sm">
                  <span className="font-medium text-ink">{n.title}</span>
                  <span className="ml-2 text-ink-muted">{n.body}</span>
                </li>
              ))}
          </ul>
        </Card>
      )}

      <div className="space-y-3">
        {loading && orders.length === 0 && (
          <p className="text-sm text-ink-muted">Chargement des livraisons...</p>
        )}
        {!loading && orders.length === 0 && (
          <p className="text-sm text-ink-muted">Aucun colis assigné pour le moment.</p>
        )}
        {orders.map((order) => (
          <OrderCard key={order.id} order={order}>
            <OrderPartnerPanel order={order} onChanged={refresh} />
          </OrderCard>
        ))}
      </div>
    </div>
  );
}
