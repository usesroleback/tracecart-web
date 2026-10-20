"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/apiClient";
import { IntentForm } from "@/components/tracecart/IntentForm";
import { CustomerOwnedIntentForm } from "@/components/tracecart/CustomerOwnedIntentForm";
import { OrderCard } from "@/components/tracecart/OrderCard";
import { OrderAdminPanel } from "@/components/tracecart/OrderAdminPanel";
import { QueueDepthPanel } from "@/components/tracecart/QueueDepthPanel";
import Button from "@/components/ui/button/Button";
import { ExceptionCard } from "@/components/ui/exception-card/ExceptionCard";
import { useSession } from "@/context/SessionContext";
import { fetchStatusCounts } from "@/lib/kpi/adapter";
import { Order, OrderStatus, STATUS_LABELS, STATUS_SEQUENCE } from "@/lib/types";

export function OrdersDashboard({ initialOrders }: { initialOrders: Order[] }) {
  const user = useSession();
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [counts, setCounts] = useState<Partial<Record<OrderStatus, number>>>({});
  const [formMode, setFormMode] = useState<"none" | "buy" | "customer_owned">("none");
  // True from the start: the first load begins as soon as the page mounts.
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [result, statusCounts] = await Promise.all([api.get<{ items: Order[] }>("/orders"), fetchStatusCounts()]);
      setOrders(result.items);
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

  async function handleCreated() {
    setFormMode("none");
    await refresh();
  }

  if (!user.hubId) {
    return (
      <div className="rounded-[var(--radius-m)] border border-dashed border-line-strong bg-surface-raised p-8 text-center">
        <p className="text-sm font-medium text-ink">Configurez votre hub pour commencer</p>
        <p className="mx-auto mt-1 max-w-md text-xs text-ink-muted">
          Chaque commande est rattachée au hub de l&apos;opérateur qui la crée. Configurez le vôtre avant de créer une
          intention.
        </p>
        <Button href="/hub-setup" size="s" className="mt-3">
          Configurer mon hub
        </Button>
      </div>
    );
  }

  const exceptions = orders.filter((o) => o.status === "DECLINED" || o.status === "UNAVAILABLE");

  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="sq-headline text-[32px]">Commandes</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Gérant · {user.hub?.city} — de la demande client à la confirmation au hub.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => setFormMode((v) => (v === "buy" ? "none" : "buy"))}
          >
            {formMode === "buy" ? "Fermer" : "+ Nouvelle intention"}
          </Button>
          <Button onClick={() => setFormMode((v) => (v === "customer_owned" ? "none" : "customer_owned"))}>
            {formMode === "customer_owned" ? "Fermer" : "+ Transport seul"}
          </Button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-3 border-t-[var(--border-strong)] border-b border-t-ink border-b-line sm:grid-cols-6">
        {STATUS_SEQUENCE.map((status, i) => (
          <div key={status} className={`py-4 pr-3 ${i > 0 ? "border-l border-line pl-3" : ""}`}>
            <p className="sq-numeral-l text-[28px]">{counts[status] ?? 0}</p>
            <p className="mt-1 text-[12px] text-ink-muted">{STATUS_LABELS[status]}</p>
          </div>
        ))}
      </div>

      {formMode === "buy" && (
        <div className="mt-6">
          <IntentForm onCreated={handleCreated} onCancel={() => setFormMode("none")} />
        </div>
      )}
      {formMode === "customer_owned" && (
        <div className="mt-6">
          <CustomerOwnedIntentForm onCreated={handleCreated} onCancel={() => setFormMode("none")} />
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div>
          <div className="mb-6">
            <QueueDepthPanel />
          </div>

          <div className="space-y-3">
            {loading && orders.length === 0 && <p className="text-sm text-ink-muted">Chargement des commandes...</p>}
            {!loading && orders.length === 0 && <p className="text-sm text-ink-muted">Aucune commande pour le moment.</p>}
            {orders.map((order) => (
              <OrderCard key={order.id} order={order}>
                <OrderAdminPanel order={order} onChanged={refresh} />
              </OrderCard>
            ))}
          </div>
        </div>

        <div className="grid content-start gap-3">
          <h2 className="sq-title">Besoin d&apos;une action</h2>
          {exceptions.length === 0 ? (
            <p className="text-sm text-ink-muted">Aucune commande déclinée ou indisponible en attente.</p>
          ) : (
            exceptions.map((order) => (
              <ExceptionCard
                key={order.id}
                title={order.productName}
                meta={`${order.reference} · ${STATUS_LABELS[order.status]}`}
                actions={
                  <Button href="/orders" size="s">
                    Voir la commande
                  </Button>
                }
              >
                {order.customerName} · {order.customerPhone}
              </ExceptionCard>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
