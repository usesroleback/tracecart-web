"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/apiClient";
import { useSession } from "@/context/SessionContext";
import { IntentForm } from "@/components/kaya/IntentForm";
import { Badge } from "@/components/ui/badge/Badge";
import { Card } from "@/components/ui/card/Card";
import Button from "@/components/ui/button/Button";
import { KpiRow } from "@/components/kaya/KpiRow";
import { PanelShell } from "@/components/kaya/PanelShell";
import { RankingBars } from "@/components/charts/RankingBars";
import { BulletChart } from "@/components/charts/BulletChart";
import { fetchReservationRanking, fetchReservationStats } from "@/lib/kpi/adapter";
import { RESERVATION_CONVERSION_TARGET_PCT } from "@/lib/kpi/thresholds";
import { RankingItem, ReservationStats } from "@/lib/kpi/types";
import { productPlaceholder } from "@/lib/placeholderImage";
import { Paginated, Reservation } from "@/lib/types";

const PAGE_LIMIT = 100;
const STATS_RANGE_DAYS = 30;

export function ReservationsDashboard({
  initialReservations,
  initialTotal,
}: {
  initialReservations: Reservation[];
  initialTotal: number;
}) {
  const user = useSession();
  const [reservations, setReservations] = useState<Reservation[]>(initialReservations);
  const [total, setTotal] = useState(initialTotal);
  const [converting, setConverting] = useState<Reservation | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<ReservationStats | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [ranking, setRanking] = useState<RankingItem[] | null>(null);
  const [rankingError, setRankingError] = useState<string | null>(null);
  const [rankingLoading, setRankingLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchReservationStats(STATS_RANGE_DAYS)
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch((err) => {
        if (!cancelled) setStatsError(err instanceof Error ? err.message : "Impossible de charger les statistiques");
      })
      .finally(() => {
        if (!cancelled) setStatsLoading(false);
      });
    fetchReservationRanking(STATS_RANGE_DAYS)
      .then((data) => {
        if (!cancelled) setRanking(data);
      })
      .catch((err) => {
        if (!cancelled) setRankingError(err instanceof Error ? err.message : "Impossible de charger le classement");
      })
      .finally(() => {
        if (!cancelled) setRankingLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function refresh() {
    const result = await api.get<Paginated<Reservation>>(`/reservations?limit=${PAGE_LIMIT}`);
    setReservations(result.items);
    setTotal(result.total);
  }

  const conversionRateKpi = stats?.kpis.find((k) => k.key === "conversionRatePct");

  async function remove(id: string) {
    setRemovingId(id);
    setError(null);
    try {
      await api.delete(`/reservations/${id}`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de retirer cette réservation");
    } finally {
      setRemovingId(null);
    }
  }

  function handleConverted() {
    setConverting(null);
    refresh();
  }

  const reserved = reservations.filter((r) => r.status === "RESERVED");
  const converted = reservations.filter((r) => r.status === "CONVERTED");

  return (
    <div>
      <div className="mb-6">
        <h1 className="sq-headline text-[32px]">Produits réservés</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Produits mis de côté depuis la recherche. Transformez-les en commande dès qu&apos;un client est prêt.
        </p>
        {total > reservations.length && (
          <p className="mt-1 text-xs text-ink-muted">
            Affichage des {reservations.length} plus récents sur {total} au total.
          </p>
        )}
      </div>

      <div className="mb-6">
        <KpiRow stats={stats} loading={statsLoading} error={statsError} currency={user.hub?.currency ?? ""} />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <PanelShell
          title="Taux de conversion"
          loading={statsLoading}
          error={statsError}
          empty={false}
          emptyLabel=""
        >
          {conversionRateKpi && (
            <BulletChart
              label="Réservations transformées en commande"
              value={conversionRateKpi.value}
              target={RESERVATION_CONVERSION_TARGET_PCT}
              format={(v) => `${v}%`}
            />
          )}
        </PanelShell>
        <div className="lg:col-span-2">
          <PanelShell
            title="Boutique la plus réservée"
            loading={rankingLoading}
            error={rankingError}
            empty={!!ranking && ranking.length === 0}
            emptyLabel="Aucune réservation sur les 30 derniers jours."
          >
            {ranking && (
              <RankingBars items={ranking.map((r) => ({ key: r.key, label: r.label, value: r.count, logoUrl: r.logoUrl }))} />
            )}
          </PanelShell>
        </div>
      </div>

      {error && <p className="mb-4 rounded-[var(--radius-s)] bg-critical-soft px-3 py-2 text-sm text-critical">{error}</p>}

      {converting && (
        <div className="mb-6">
          <IntentForm
            onCreated={handleConverted}
            onCancel={() => setConverting(null)}
            initialProduct={{
              url: converting.url,
              name: converting.title ?? undefined,
              imageUrl: converting.imageUrl ?? undefined,
              provider: converting.provider,
              reservationId: converting.id,
            }}
          />
        </div>
      )}

      <div className="mb-8">
        <p className="sq-overline mb-3 flex items-center gap-2">
          En attente <Badge variant="attn">{reserved.length}</Badge>
        </p>
        {reserved.length === 0 ? (
          <p className="text-sm text-ink-muted">
            Aucun produit réservé.{" "}
            <Link href="/products" className="font-medium text-accent-ink underline">
              Rechercher des produits
            </Link>
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {reserved.map((r) => (
              <Card key={r.id} className="flex flex-col overflow-hidden p-0!">
                <div className="relative aspect-square w-full overflow-hidden bg-surface-sunken">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={r.imageUrl || productPlaceholder(r.id)}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                  {r.provider?.logoUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={r.provider.logoUrl}
                      alt=""
                      className="absolute left-2 top-2 h-6 w-6 rounded-[var(--radius-s)] bg-surface-raised/90 object-contain p-1 shadow-[var(--shadow-1)]"
                    />
                  )}
                </div>
                <div className="flex flex-1 flex-col p-3.5">
                  <p className="line-clamp-2 flex-1 text-sm font-medium text-ink">
                    {r.title ?? "Produit sans titre"}
                  </p>
                  {r.price != null && (
                    <p className="mt-2 text-base font-semibold text-accent-ink">
                      {Number(r.price).toLocaleString("fr-FR")} <span className="text-xs font-normal text-ink-muted">{r.currency}</span>
                    </p>
                  )}
                  <div className="mt-3 flex gap-2">
                    <Button size="s" block onClick={() => setConverting(r)}>
                      Créer une commande
                    </Button>
                    <Button
                      variant="secondary"
                      size="s"
                      onClick={() => remove(r.id)}
                      disabled={removingId === r.id}
                    >
                      ✕
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {converted.length > 0 && (
        <div>
          <p className="sq-overline mb-3 flex items-center gap-2">
            Transformées en commande <Badge variant="positive">{converted.length}</Badge>
          </p>
          <div className="space-y-2">
            {converted.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-[var(--radius-m)] border border-line bg-surface-raised px-4 py-2.5 text-sm"
              >
                <span className="text-ink">{r.title ?? "Produit sans titre"}</span>
                {r.order && (
                  <Link href="/orders" className="font-medium text-accent-ink hover:underline">
                    {r.order.reference}
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
