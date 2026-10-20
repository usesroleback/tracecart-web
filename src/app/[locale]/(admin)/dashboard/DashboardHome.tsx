"use client";

import { useState } from "react";
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
import { ROLE_LABELS, nameFromEmail } from "@/lib/people";
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

export function DashboardHome({ initialOrders, initialStats }: { initialOrders: Order[]; initialStats: DashboardStats | null }) {
  const user = useSession();
  const orders = initialOrders;
  const statsError = initialStats ? null : "Impossible de charger les statistiques.";
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
          <p className="rb-overline">{user.hub ? `${user.hub.city}, ${user.hub.country}` : "Hub non configuré"}</p>
          <h1 className="rb-headline text-[32px]">{name}</h1>
          <p className="mt-1.5 max-w-xl text-sm text-ink-muted">
            {ROLE_LABELS[user.role]} · {needsAttention.length === 0
              ? "rien à traiter pour le moment."
              : `${needsAttention.length} commande${needsAttention.length > 1 ? "s" : ""} à traiter.`}
          </p>
        </div>

        {!user.hubId && (
          <div className="mb-6 rounded-[var(--radius-m)] border border-dashed border-line-strong bg-surface-raised p-8 text-center">
            <p className="text-sm font-medium text-ink">Configurez votre hub pour commencer</p>
            <Button href="/hub-setup" size="s" className="mt-3">
              Configurer mon hub
            </Button>
          </div>
        )}

        <div className="mb-6">
          <KpiRow stats={initialStats} loading={false} error={statsError} currency={user.hub?.currency ?? ""} />
        </div>

        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <QuickAction href="/orders" icon={<DsPackageIcon />} label="Nouvelle intention" description="Créer une commande client" />
          <QuickAction href="/products" icon={<DsSearchIcon />} label="Rechercher des produits" description="Chercher et réserver" />
          <QuickAction href="/stores" icon={<DsBuildingIcon />} label="Boutiques" description="Gérer les boutiques" />
          <QuickAction href="/hub-setup" icon={<DsHubIcon />} label="Mon hub" description="Voir ou changer de hub" />
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
            <h2 className="rb-title text-[14px]">Nécessite votre attention</h2>
            <Link href="/orders" className="rb-link text-xs font-medium">
              Voir tout
            </Link>
          </div>
          <Card>
            <AttentionTable orders={needsAttention} loading={false} emptyLabel="Rien ne nécessite votre attention pour le moment." />
          </Card>
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="rb-title text-[14px]">Commandes récentes</h2>
            <Link href="/orders" className="rb-link text-xs font-medium">
              Voir tout
            </Link>
          </div>
          <div className="space-y-3">
            {recent.length === 0 && <p className="text-sm text-ink-muted">Aucune commande pour le moment.</p>}
            {recent.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return <CarrierHome orders={orders} name={name} />;
}

const CARRIER_STAGES: { key: string; label: string; statuses: OrderStatus[] }[] = [
  { key: "quote", label: "À coter", statuses: ["QUOTING", "QUOTED"] },
  { key: "ready", label: "À gérer", statuses: ["CONFIRMED_HUB"] },
  { key: "moving", label: "En route", statuses: ["PICKED_UP", "IN_TRANSIT"] },
  { key: "delivered", label: "Livrés", statuses: ["DELIVERED"] },
];

/**
 * The carrier's home: their own stages (not the admin's revenue KPIs), what
 * is waiting on them first, then their recent parcels in the ops table.
 */
function CarrierHome({ orders, name }: { orders: Order[]; name: string }) {
  const router = useRouter();
  const [openId, setOpenId] = useState<string | null>(null);
  const toQuote = orders.filter((o) => o.status === "QUOTING");
  const toCollect = orders.filter((o) => o.status === "CONFIRMED_HUB");
  const todo = toQuote.length + toCollect.length;

  return (
    <div>
      <div className="mb-6">
        <p className="rb-overline">{ROLE_LABELS.LOGISTICS_PARTNER}</p>
        <h1 className="rb-headline text-[32px]">{name}</h1>
        <p className="mt-1.5 max-w-xl text-sm text-ink-muted">
          {todo === 0
            ? "Rien à coter ni à gérer pour le moment."
            : [
                toQuote.length > 0 && `${toQuote.length} cotation${toQuote.length > 1 ? "s" : ""} à soumettre`,
                toCollect.length > 0 && `${toCollect.length} colis à gérer`,
              ]
                .filter(Boolean)
                .join(" · ") + "."}
        </p>
      </div>

      <KpiStrip
        className="mb-6"
        items={CARRIER_STAGES.map((stage) => ({
          key: stage.key,
          label: stage.label,
          value: orders.filter((o) => stage.statuses.includes(o.status)).length,
        }))}
      />

      {todo > 0 && (
        <div className="mb-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="rb-title">À faire</h2>
            <Link href="/deliveries" className="rb-link text-sm font-medium">
              Toutes les livraisons
            </Link>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
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
          </div>
        </div>
      )}

      <div className="mb-6">
        <QueueDepthPanel />
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="rb-title">Colis récents</h2>
          <Link href="/deliveries" className="rb-link text-sm font-medium">
            Voir tout
          </Link>
        </div>
        {orders.length === 0 ? (
          <p className="text-sm text-ink-muted">Aucun colis assigné pour le moment.</p>
        ) : (
          <OrdersTable
            caption="Colis récents"
            orders={orders.slice(0, 8)}
            openId={openId}
            onToggle={(id) => setOpenId((cur) => (cur === id ? null : id))}
            amountOf={logisticsAmount}
            amountLabel="Votre devis"
            renderDetail={(order) => <OrderPartnerPanel order={order} onChanged={() => router.refresh()} />}
          />
        )}
      </div>
    </div>
  );
}
