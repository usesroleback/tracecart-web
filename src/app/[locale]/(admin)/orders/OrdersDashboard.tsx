"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { api } from "@/lib/apiClient";
import { IntentForm } from "@/components/tracecart/IntentForm";
import { CustomerOwnedIntentForm } from "@/components/tracecart/CustomerOwnedIntentForm";
import { OrdersTable } from "@/components/tracecart/OrdersTable";
import { OrderAdminPanel } from "@/components/tracecart/OrderAdminPanel";
import { QueueDepthPanel } from "@/components/tracecart/QueueDepthPanel";
import { sideColor } from "@/components/tracecart/CorridorTracker";
import Button from "@/components/ui/button/Button";
import { Badge } from "@/components/ui/badge/Badge";
import { ExceptionCard } from "@/components/ui/exception-card/ExceptionCard";
import { KpiStrip } from "@/components/ui/kpi-strip/KpiStrip";
import { SegmentedTabs } from "@/components/ui/tabs/Tabs";
import { useSession } from "@/context/SessionContext";
import { fetchStatusCounts } from "@/lib/kpi/adapter";
import { ORDERS_PAGE_LIMIT } from "@/lib/ordersQuery";
import { DsPlusIcon } from "@/icons";
import { ROLE_LABELS } from "@/lib/people";
import { Order, OrderStatus, STATUS_LABELS } from "@/lib/types";

type Segment = "all" | "preparing" | "hub" | "moving" | "delivered" | "exceptions";

const isException = (s: OrderStatus) => s === "DECLINED" || s === "UNAVAILABLE";

// Same phases as the status glyphs (Status.tsx orderStatusState): origin =
// planned, the hub handoff = held, the partner's leg = moving, delivered = done.
function segmentOf(status: OrderStatus): Exclude<Segment, "all"> {
  if (isException(status)) return "exceptions";
  if (status === "DELIVERED") return "delivered";
  const phase = sideColor(status);
  if (phase === "handoff") return "hub";
  if (phase === "transit") return "moving";
  return "preparing";
}

const SEGMENT_LABELS: Record<Segment, string> = {
  all: "Toutes",
  preparing: "En préparation",
  hub: "Au hub",
  moving: "En route",
  delivered: "Livrées",
  exceptions: "Exceptions",
};

function countWhere(counts: Partial<Record<OrderStatus, number>>, test: (s: OrderStatus) => boolean): number {
  return (Object.entries(counts) as [OrderStatus, number][]).reduce((sum, [s, n]) => (test(s) ? sum + n : sum), 0);
}

/**
 * The TraceCartOps console (project/components/TraceCartOps/preview.html):
 * header, ruled KPI strip, status segments over a dense table, and a
 * "Needs a decision" column where exceptions surface first.
 */
export function OrdersDashboard({ initialOrders, initialTotal }: { initialOrders: Order[]; initialTotal: number }) {
  const user = useSession();
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [total, setTotal] = useState(initialTotal);
  const [counts, setCounts] = useState<Partial<Record<OrderStatus, number>>>({});
  const [formMode, setFormMode] = useState<"none" | "buy" | "customer_owned">("none");
  // The selected tab lives in the URL (?statut=), so the sidebar can link
  // straight to a step and back/forward and shared links keep it.
  const router = useRouter();
  const tab = useSearchParams().get("statut");
  const segment: Segment = tab && tab in SEGMENT_LABELS ? (tab as Segment) : "all";
  const setSegment = (id: Segment) =>
    router.replace({ pathname: "/orders", query: id === "all" ? {} : { statut: id } }, { scroll: false });
  const [openId, setOpenId] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  // True from the start: the first load begins as soon as the page mounts.
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [result, statusCounts] = await Promise.all([
        api.get<{ items: Order[]; total: number }>(`/orders?limit=${ORDERS_PAGE_LIMIT}`),
        fetchStatusCounts(),
      ]);
      setOrders(result.items);
      setTotal(result.total);
      setCounts(statusCounts);
      setUpdatedAt(new Date());
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

  const exceptions = orders.filter((o) => isException(o.status));
  const segmentCounts = orders.reduce<Record<Segment, number>>(
    (acc, o) => {
      acc[segmentOf(o.status)] += 1;
      return acc;
    },
    { all: orders.length, preparing: 0, hub: 0, moving: 0, delivered: 0, exceptions: 0 }
  );
  const visible = segment === "all" ? orders : orders.filter((o) => segmentOf(o.status) === segment);
  const active = countWhere(counts, (s) => s !== "DELIVERED" && !isException(s));

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="rb-headline text-[32px]">Commandes</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {ROLE_LABELS[user.role]} · hub de {user.hub?.city} · {active} actives
            {updatedAt && (
              <> · mis à jour {updatedAt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            startIcon={formMode === "buy" ? undefined : <DsPlusIcon width={18} height={18} />}
            onClick={() => setFormMode((v) => (v === "buy" ? "none" : "buy"))}
          >
            {formMode === "buy" ? "Fermer" : "Nouvelle intention"}
          </Button>
          <Button
            startIcon={formMode === "customer_owned" ? undefined : <DsPlusIcon width={18} height={18} />}
            onClick={() => setFormMode((v) => (v === "customer_owned" ? "none" : "customer_owned"))}
          >
            {formMode === "customer_owned" ? "Fermer" : "Transport seul"}
          </Button>
        </div>
      </div>

      <KpiStrip
        className="mt-6"
        items={[
          { key: "active", value: active, label: "Actives" },
          { key: "preparing", value: countWhere(counts, (s) => segmentOf(s) === "preparing"), label: "En préparation" },
          { key: "hub", value: countWhere(counts, (s) => segmentOf(s) === "hub"), label: "Prêtes au hub" },
          { key: "moving", value: countWhere(counts, (s) => segmentOf(s) === "moving"), label: "En route" },
          { key: "delivered", value: counts.DELIVERED ?? 0, label: "Livrées" },
        ]}
      />

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

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">
          <SegmentedTabs
            label="Statut"
            className="mb-3"
            value={segment}
            onChange={setSegment}
            tabs={(Object.keys(SEGMENT_LABELS) as Segment[]).map((id) => ({
              id,
              label: SEGMENT_LABELS[id],
              count: segmentCounts[id],
            }))}
          />

          {loading && orders.length === 0 && <p className="text-sm text-ink-muted">Chargement des commandes...</p>}
          {!loading && orders.length === 0 && <p className="text-sm text-ink-muted">Aucune commande pour le moment.</p>}
          {orders.length > 0 && visible.length === 0 && (
            <p className="text-sm text-ink-muted">Aucune commande « {SEGMENT_LABELS[segment].toLowerCase()} » pour le moment.</p>
          )}
          {visible.length > 0 && (
            <OrdersTable
              caption={`Commandes — ${SEGMENT_LABELS[segment]}`}
              orders={visible}
              openId={openId}
              onToggle={(id) => setOpenId((cur) => (cur === id ? null : id))}
              renderDetail={(order) => <OrderAdminPanel order={order} onChanged={refresh} />}
            />
          )}
          {total > orders.length && (
            <p className="mt-3 text-[13px] text-ink-muted">
              Les {orders.length} commandes les plus récentes sur {total}.
            </p>
          )}
        </div>

        <aside className="grid content-start gap-3" aria-label="Besoin d'une décision">
          <div className="flex items-center justify-between">
            <h2 className="rb-title">Besoin d&apos;une décision</h2>
            {exceptions.length > 0 && <Badge variant="critical">{exceptions.length}</Badge>}
          </div>
          {exceptions.length === 0 ? (
            <p className="text-sm text-ink-muted">Aucune commande déclinée ou indisponible en attente.</p>
          ) : (
            exceptions.map((order) => (
              <ExceptionCard
                key={order.id}
                title={order.productName}
                meta={`${order.reference} · ${STATUS_LABELS[order.status]}`}
                actions={
                  <Button size="s" variant="secondary" href={`/orders/${order.id}`}>
                    Ouvrir la commande
                  </Button>
                }
              >
                {order.customerName} · {order.customerPhone}
              </ExceptionCard>
            ))
          )}
          <div className="mt-3">
            <QueueDepthPanel />
          </div>
        </aside>
      </div>
    </div>
  );
}
