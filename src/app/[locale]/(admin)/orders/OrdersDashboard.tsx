"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
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
import { Order, OrderStatus } from "@/lib/types";
import { useFormat } from "@/lib/format";

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

// Labels are orders.segments.*.
const SEGMENTS: Segment[] = ["all", "preparing", "hub", "moving", "delivered", "exceptions"];

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
  const t = useTranslations("orders");
  const tl = useTranslations("labels");
  const f = useFormat();
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [total, setTotal] = useState(initialTotal);
  const [counts, setCounts] = useState<Partial<Record<OrderStatus, number>>>({});
  const [formMode, setFormMode] = useState<"none" | "buy" | "customer_owned">("none");
  // The selected tab lives in the URL (?statut=), so the sidebar can link
  // straight to a step and back/forward and shared links keep it.
  const router = useRouter();
  const tab = useSearchParams().get("statut");
  const segment: Segment = tab && SEGMENTS.includes(tab as Segment) ? (tab as Segment) : "all";
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
        <p className="text-sm font-medium text-ink">{t("noHub.title")}</p>
        <p className="mx-auto mt-1 max-w-md text-xs text-ink-muted">
          {t("noHub.body")}
        </p>
        <Button href="/hub-setup" size="s" className="mt-3">
          {t("noHub.cta")}
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
          <h1 className="rb-headline text-[32px]">{t("title")}</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {t("summary", { role: tl(`role.${user.role}`), city: user.hub?.city ?? "", active })}
            {updatedAt && t("updatedAt", { time: f.time(updatedAt) })}
          </p>
        </div>
        {user.permissions?.includes("orders.create") ? (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            startIcon={formMode === "buy" ? undefined : <DsPlusIcon width={18} height={18} />}
            onClick={() => setFormMode((v) => (v === "buy" ? "none" : "buy"))}
          >
            {formMode === "buy" ? t("close") : t("newIntent")}
          </Button>
          <Button
            startIcon={formMode === "customer_owned" ? undefined : <DsPlusIcon width={18} height={18} />}
            onClick={() => setFormMode((v) => (v === "customer_owned" ? "none" : "customer_owned"))}
          >
            {formMode === "customer_owned" ? t("close") : t("transportOnly")}
          </Button>
        </div>
        ) : null}
      </div>

      <KpiStrip
        className="mt-6"
        items={[
          { key: "active", value: active, label: t("kpi.active") },
          { key: "preparing", value: countWhere(counts, (s) => segmentOf(s) === "preparing"), label: t("kpi.preparing") },
          { key: "hub", value: countWhere(counts, (s) => segmentOf(s) === "hub"), label: t("kpi.hub") },
          { key: "moving", value: countWhere(counts, (s) => segmentOf(s) === "moving"), label: t("kpi.moving") },
          { key: "delivered", value: counts.DELIVERED ?? 0, label: t("kpi.delivered") },
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

      <div className="mt-6 grid gap-6 @min-[1064px]/main:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">
          <SegmentedTabs
            label={t("statusLabel")}
            className="mb-3"
            value={segment}
            onChange={setSegment}
            tabs={SEGMENTS.map((id) => ({
              id,
              label: t(`segments.${id}`),
              count: segmentCounts[id],
            }))}
          />

          {loading && orders.length === 0 && <p className="text-sm text-ink-muted">{t("loading")}</p>}
          {!loading && orders.length === 0 && <p className="text-sm text-ink-muted">{t("empty")}</p>}
          {orders.length > 0 && visible.length === 0 && (
            <p className="text-sm text-ink-muted">{t("emptySegment", { segment: t(`segments.${segment}`).toLowerCase() })}</p>
          )}
          {visible.length > 0 && (
            <OrdersTable
              caption={t("caption", { segment: t(`segments.${segment}`) })}
              orders={visible}
              openId={openId}
              onToggle={(id) => setOpenId((cur) => (cur === id ? null : id))}
              renderDetail={(order) => <OrderAdminPanel order={order} onChanged={refresh} />}
            />
          )}
          {total > orders.length && (
            <p className="mt-3 text-[13px] text-ink-muted">
              {t("showing", { shown: orders.length, total })}
            </p>
          )}
        </div>

        <aside className="grid content-start gap-3" aria-label={t("decision.title")}>
          <div className="flex items-center justify-between">
            <h2 className="rb-title">{t("decision.title")}</h2>
            {exceptions.length > 0 && <Badge variant="critical">{exceptions.length}</Badge>}
          </div>
          {exceptions.length === 0 ? (
            <p className="text-sm text-ink-muted">{t("decision.none")}</p>
          ) : (
            exceptions.map((order) => (
              <ExceptionCard
                key={order.id}
                title={order.productName}
                meta={`${order.reference} · ${tl(`status.${order.status}`)}`}
                actions={
                  <Button size="s" variant="secondary" href={`/orders/${order.id}`}>
                    {t("decision.open")}
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
