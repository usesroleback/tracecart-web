"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from '@/i18n/navigation';

import { useSession } from "@/context/SessionContext";
import { OrderCard } from "@/components/tracecart/OrderCard";
import { AttentionTable } from "@/components/tracecart/AttentionTable";
import { KpiRow } from "@/components/tracecart/KpiRow";
import { TrendPanel } from "@/components/tracecart/TrendPanel";
import { BreakdownPanel } from "@/components/tracecart/BreakdownPanel";
import { QueueDepthPanel } from "@/components/tracecart/QueueDepthPanel";
import { OrdersTable, logisticsAmount } from "@/components/tracecart/OrdersTable";
import { OrderPartnerPanel } from "@/components/tracecart/OrderPartnerPanel";
import { Card } from "@/components/ui/card/Card";
import { ExceptionCard } from "@/components/ui/exception-card/ExceptionCard";
import { KpiStrip } from "@/components/ui/kpi-strip/KpiStrip";
import Button from "@/components/ui/button/Button";
import { DsSearchIcon, DsBuildingIcon, DsHubIcon, DsPackageIcon } from "@/icons";
import { WorkBoard, WorkItem } from "@/components/dashboard/WorkBoard";
import { nameFromEmail } from "@/lib/people";
import { useRoleName } from "@/lib/useRoleName";
import { useFormat } from "@/lib/format";
import { Order, OrderStatus } from "@/lib/types";
import { DashboardStats } from "@/lib/kpi/types";

const DASHBOARD_RANGE_DAYS = 30;

function QuickAction({ href, icon, label, description }: { href: string; icon: React.ReactNode; label: string; description: string }) {
  return (
    <Link href={href} className="block">
      <Card interactive className="flex items-start gap-3">
        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[var(--radius-s)] bg-surface-sunken text-ink">
          {icon}
        </span>
        <div>
          <p className="text-sm font-semibold text-ink">{label}</p>
          <p className="mt-0.5 text-xs text-ink-muted">{description}</p>
        </div>
      </Card>
    </Link>
  );
}

export function DashboardHome({ work, initialOrders, initialStats }: { work: WorkItem[]; initialOrders: Order[]; initialStats: DashboardStats | null }) {
  const user = useSession();
  const t = useTranslations("dashboard");
  const roleName = useRoleName(user);
  const orders = initialOrders;
  const statsError = initialStats ? null : t("statsFailed");
  // The headline is who's signed in, taken from their email; no greeting.
  const name = nameFromEmail(user.email);

  if (user.role === "SUPER_ADMIN") {
    const needsAttention = orders
      .filter((o) => o.status === "QUOTED" || o.status === "RECEIVED_HUB")
      .slice(0, 5);
    const recent = orders.slice(0, 5);

    return (
      <div>
        <div className="mb-6">
          <p className="rb-overline">{user.hub ? `${user.hub.city}, ${user.hub.country}` : t("noHub")}</p>
          <h1 className="rb-headline text-[32px]">{name}</h1>
          <p className="mt-1.5 max-w-xl text-sm text-ink-muted">
            {roleName} ·{" "}
            {needsAttention.length === 0 ? t("admin.nothingToHandle") : t("admin.toHandle", { count: needsAttention.length })}
          </p>
        </div>

        {!user.hubId && (
          <div className="mb-6 rounded-[var(--radius-m)] border border-dashed border-line-strong bg-surface-raised p-8 text-center">
            <p className="text-sm font-medium text-ink">{t("admin.setupHub")}</p>
            <Button href="/hub-setup" size="s" className="mt-3">
              {t("admin.setupHubCta")}
            </Button>
          </div>
        )}

        <WorkBoard items={work} />

        <div className="mb-6">
          <KpiRow stats={initialStats} loading={false} error={statsError} currency={user.hub?.currency ?? ""} />
        </div>

        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <QuickAction href="/orders" icon={<DsPackageIcon />} label={t("quick.newIntent")} description={t("quick.newIntentHint")} />
          <QuickAction href="/products" icon={<DsSearchIcon />} label={t("quick.products")} description={t("quick.productsHint")} />
          <QuickAction href="/stores" icon={<DsBuildingIcon />} label={t("quick.stores")} description={t("quick.storesHint")} />
          <QuickAction href="/hub-setup" icon={<DsHubIcon />} label={t("quick.hub")} description={t("quick.hubHint")} />
        </div>

        <div className="mb-6 grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <TrendPanel rangeDays={DASHBOARD_RANGE_DAYS} />
          </div>
          <BreakdownPanel rangeDays={DASHBOARD_RANGE_DAYS} />
        </div>

        <div className="mb-6">
          <QueueDepthPanel />
        </div>

        <div className="mb-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="rb-title text-[14px]">{t("attention.title")}</h2>
            <Link href="/orders" className="rb-link text-xs font-medium">
              {t("seeAll")}
            </Link>
          </div>
          <Card>
            <AttentionTable orders={needsAttention} loading={false} emptyLabel={t("attention.empty")} />
          </Card>
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="rb-title text-[14px]">{t("recent.title")}</h2>
            <Link href="/orders" className="rb-link text-xs font-medium">
              {t("seeAll")}
            </Link>
          </div>
          <div className="space-y-3">
            {recent.length === 0 && <p className="text-sm text-ink-muted">{t("recent.empty")}</p>}
            {recent.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (user.permissions?.includes("orders.transition") && user.role === "LOGISTICS_PARTNER") return <CarrierHome orders={orders} name={name} work={work} />;

  // Everyone else: who they are, and what's waiting on them.
  return (
    <div>
      <div className="mb-6">
        <p className="rb-overline">{roleName}</p>
        <h1 className="rb-headline text-[32px]">{name}</h1>
      </div>
      <WorkBoard items={work} />
    </div>
  );
}

// Keys are deliveries.stages.* (the Livraisons tabs).
const CARRIER_STAGES: { key: string; statuses: OrderStatus[] }[] = [
  { key: "quote", statuses: ["QUOTING", "QUOTED"] },
  { key: "ready", statuses: ["CONFIRMED_HUB"] },
  { key: "moving", statuses: ["PICKED_UP", "IN_TRANSIT"] },
  { key: "delivered", statuses: ["DELIVERED"] },
];

/**
 * The carrier's home: their own stages (not the admin's revenue KPIs), what
 * is waiting on them first, then their recent parcels in the ops table.
 */
function CarrierHome({ orders, name, work }: { orders: Order[]; name: string; work: WorkItem[] }) {
  const router = useRouter();
  const t = useTranslations("dashboard");
  const td = useTranslations("deliveries");
  const tr = useTranslations("labels.role");
  const f = useFormat();
  const [openId, setOpenId] = useState<string | null>(null);
  const toQuote = orders.filter((o) => o.status === "QUOTING");
  const toCollect = orders.filter((o) => o.status === "CONFIRMED_HUB");
  const todo = toQuote.length + toCollect.length;

  return (
    <div>
      <div className="mb-6">
        <p className="rb-overline">{tr("LOGISTICS_PARTNER")}</p>
        <h1 className="rb-headline text-[32px]">{name}</h1>
        <p className="mt-1.5 max-w-xl text-sm text-ink-muted">
          {todo === 0
            ? td("todo.none")
            : [
                toQuote.length > 0 && td("todo.summaryQuotes", { count: toQuote.length }),
                toCollect.length > 0 && td("todo.summaryParcels", { count: toCollect.length }),
              ]
                .filter(Boolean)
                .join(" · ") + "."}
        </p>
      </div>

      <WorkBoard items={work} />

      <KpiStrip
        className="mb-6"
        items={CARRIER_STAGES.map((stage) => ({
          key: stage.key,
          label: td(`stages.${stage.key}`),
          value: orders.filter((o) => stage.statuses.includes(o.status)).length,
        }))}
      />

      {todo > 0 && (
        <div className="mb-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="rb-title">{td("todo.title")}</h2>
            <Link href="/deliveries" className="rb-link text-sm font-medium">
              {t("carrier.allDeliveries")}
            </Link>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {toQuote.map((order) => (
              <ExceptionCard
                key={order.id}
                severity="held"
                title={td("todo.quoteTitle", { product: order.productName })}
                meta={`${order.reference} · ${order.hub.city} → ${order.destinationCity}`}
                actions={
                  <Button size="s" variant="secondary" href={`/orders/${order.id}`}>
                    {td("todo.quote")}
                  </Button>
                }
              >
                {td("todo.quantity", { quantity: f.number(order.quantity) })}
              </ExceptionCard>
            ))}
            {toCollect.map((order) => (
              <ExceptionCard
                key={order.id}
                severity="held"
                title={td("todo.readyTitle", { product: order.productName })}
                meta={`${order.reference} · ${order.hub.city} → ${order.destinationCity}`}
                actions={
                  <Button size="s" variant="secondary" href={`/orders/${order.id}`}>
                    {td("todo.open")}
                  </Button>
                }
              >
                {td("todo.readyBody")}
              </ExceptionCard>
            ))}
          </div>
        </div>
      )}

      <div className="mb-6">
        <QueueDepthPanel />
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="rb-title">{t("carrier.recent")}</h2>
          <Link href="/deliveries" className="rb-link text-sm font-medium">
            {t("seeAll")}
          </Link>
        </div>
        {orders.length === 0 ? (
          <p className="text-sm text-ink-muted">{td("empty")}</p>
        ) : (
          <OrdersTable
            caption={t("carrier.recent")}
            orders={orders.slice(0, 8)}
            openId={openId}
            onToggle={(id) => setOpenId((cur) => (cur === id ? null : id))}
            amountOf={logisticsAmount}
            amountLabel={td("yourQuote")}
            renderDetail={(order) => <OrderPartnerPanel order={order} onChanged={() => router.refresh()} />}
          />
        )}
      </div>
    </div>
  );
}
