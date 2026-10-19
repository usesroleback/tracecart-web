"use client";

import { Link } from '@/i18n/navigation';

import { useSession } from "@/context/SessionContext";
import { OrderCard } from "@/components/kaya/OrderCard";
import { AttentionTable } from "@/components/kaya/AttentionTable";
import { KpiRow } from "@/components/kaya/KpiRow";
import { TrendPanel } from "@/components/kaya/TrendPanel";
import { BreakdownPanel } from "@/components/kaya/BreakdownPanel";
import { QueueDepthPanel } from "@/components/kaya/QueueDepthPanel";
import { Card } from "@/components/ui/card/Card";
import Button from "@/components/ui/button/Button";
import { DsSearchIcon, DsBuildingIcon, DsHubIcon, DsPackageIcon, DsTruckIcon } from "@/icons";
import { Order } from "@/lib/types";
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
  const firstName = user.name.split(" ")[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bonjour" : hour < 18 ? "Bon après-midi" : "Bonsoir";

  if (user.role === "SUPER_ADMIN") {
    const needsAttention = orders
      .filter((o) => o.status === "QUOTED" || o.status === "RECEIVED_HUB")
      .slice(0, 5);
    const recent = orders.slice(0, 5);

    return (
      <div>
        <div className="mb-6">
          <p className="sq-overline">{user.hub ? `${user.hub.city}, ${user.hub.country}` : "Hub non configuré"}</p>
          <h1 className="sq-headline text-[32px]">
            {greeting}, {firstName}
          </h1>
          <p className="mt-1.5 max-w-xl text-sm text-ink-muted">
            Voici un aperçu de votre activité. Créez une intention, suivez vos cotations et gérez vos boutiques.
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
            <h2 className="sq-title text-[14px]">Nécessite votre attention</h2>
            <Link href="/orders" className="text-xs font-medium text-accent-ink hover:underline">
              Voir tout
            </Link>
          </div>
          <Card>
            <AttentionTable orders={needsAttention} loading={false} emptyLabel="Rien ne nécessite votre attention pour le moment." />
          </Card>
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="sq-title text-[14px]">Commandes récentes</h2>
            <Link href="/orders" className="text-xs font-medium text-accent-ink hover:underline">
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

  // LOGISTICS_PARTNER
  const needsAttention = orders
    .filter((o) => o.status === "QUOTING" || o.status === "CONFIRMED_HUB")
    .slice(0, 5);
  const recent = orders.slice(0, 5);
  return (
    <div>
      <div className="mb-6">
        <p className="sq-overline">Partenaire logistique</p>
        <h1 className="sq-headline text-[32px]">
          {greeting}, {firstName}
        </h1>
        <p className="mt-1.5 max-w-xl text-sm text-ink-muted">
          Voici vos colis assignés : cotations à soumettre et livraisons en cours.
        </p>
      </div>

      <div className="mb-6">
        <KpiRow stats={initialStats} loading={false} error={statsError} currency={user.hub?.currency ?? ""} />
      </div>

      <div className="mb-6">
        <QuickAction href="/deliveries" icon={<DsTruckIcon />} label="Mes livraisons" description="Voir toutes les livraisons assignées" />
      </div>

      <div className="mb-6">
        <QueueDepthPanel />
      </div>

      <div className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="sq-title text-[14px]">Nécessite votre attention</h2>
          <Link href="/deliveries" className="text-xs font-medium text-accent-ink hover:underline">
            Voir tout
          </Link>
        </div>
        <Card>
          <AttentionTable orders={needsAttention} loading={false} emptyLabel="Rien ne nécessite votre attention pour le moment." />
        </Card>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="sq-title text-[14px]">Colis récents</h2>
          <Link href="/deliveries" className="text-xs font-medium text-accent-ink hover:underline">
            Voir tout
          </Link>
        </div>
        <div className="space-y-3">
          {recent.length === 0 && <p className="text-sm text-ink-muted">Aucun colis assigné pour le moment.</p>}
          {recent.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      </div>
    </div>
  );
}
