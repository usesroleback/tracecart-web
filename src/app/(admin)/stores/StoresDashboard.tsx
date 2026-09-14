"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/apiClient";
import { StoreForm } from "@/components/kaya/StoreForm";
import { StatusPill } from "@/components/kaya/StatusPill";
import { PanelShell } from "@/components/kaya/PanelShell";
import { RankingBars } from "@/components/charts/RankingBars";
import { GaugeCard } from "@/components/charts/GaugeCard";
import { fetchBreakdown } from "@/lib/kpi/adapter";
import { Breakdown } from "@/lib/kpi/types";
import { Provider } from "@/lib/types";

const RANKING_RANGE_DAYS = 90;

export function StoresDashboard({ initialStores }: { initialStores: Provider[] }) {
  const [stores, setStores] = useState<Provider[]>(initialStores);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Provider | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [ranking, setRanking] = useState<Breakdown | null>(null);
  const [rankingError, setRankingError] = useState<string | null>(null);
  const [rankingLoading, setRankingLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchBreakdown("provider", RANKING_RANGE_DAYS)
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
    const result = await api.get<Provider[]>("/providers?includeInactive=true");
    setStores(result);
  }

  function handleSaved() {
    setShowForm(false);
    setEditing(null);
    refresh();
  }

  async function toggleActive(store: Provider) {
    setBusyId(store.id);
    try {
      await api.patch(`/providers/${store.id}`, { isActive: !store.isActive });
      await refresh();
    } finally {
      setBusyId(null);
    }
  }

  const activeCount = stores.filter((s) => s.isActive).length;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-800 dark:text-white/90">Boutiques</h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            {activeCount} boutique{activeCount !== 1 ? "s" : ""} active{activeCount !== 1 ? "s" : ""} sur{" "}
            {stores.length} — gérez la détection de produits et la recherche par boutique.
          </p>
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setShowForm((v) => !v);
          }}
          className="rounded-lg bg-abidjan-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-abidjan-700"
        >
          {showForm && !editing ? "Fermer" : "+ Nouvelle boutique"}
        </button>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <PanelShell
            title="Commandes par boutique"
            loading={rankingLoading}
            error={rankingError}
            empty={!!ranking && ranking.slices.length === 0}
            emptyLabel="Aucune commande sur les 90 derniers jours."
          >
            {ranking && (
              <RankingBars items={ranking.slices.map((s) => ({ key: s.key, label: s.label, value: s.count, logoUrl: s.logoUrl }))} />
            )}
          </PanelShell>
        </div>
        <PanelShell title="Boutiques actives" loading={false} error={null} empty={stores.length === 0} emptyLabel="Aucune boutique configurée.">
          <div className="flex justify-center">
            <GaugeCard label="Actives" value={stores.filter((s) => s.isActive).length} total={stores.length} height={160} />
          </div>
        </PanelShell>
      </div>

      {showForm && (
        <div className="mb-6">
          <StoreForm
            store={editing ?? undefined}
            onSaved={handleSaved}
            onCancel={() => {
              setShowForm(false);
              setEditing(null);
            }}
          />
        </div>
      )}

      {stores.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400">Aucune boutique configurée.</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {stores.map((store) => (
          <div
            key={store.id}
            className={`flex flex-col rounded-2xl border bg-white p-5 shadow-theme-xs transition dark:bg-white/[0.03] ${
              store.isActive
                ? "border-gray-200 dark:border-gray-800"
                : "border-gray-200 opacity-60 dark:border-gray-800"
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gray-50 p-2.5 dark:bg-white/5">
                {store.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={store.logoUrl} alt="" className="h-full w-full object-contain" />
                ) : (
                  <span className="text-sm font-semibold text-gray-400">{store.name.slice(0, 2).toUpperCase()}</span>
                )}
              </div>
              <StatusPill tone={store.isActive ? "success" : "neutral"} label={store.isActive ? "Active" : "Désactivée"} />
            </div>

            <p className="mt-3 text-sm font-semibold text-gray-800 dark:text-white/90">{store.name}</p>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              {store.type === "LOCAL_MARKETPLACE" ? "Marché local" : "International"} · {store.defaultCurrency}
            </p>
            <p className="mt-1 truncate text-xs text-gray-400 dark:text-gray-500">{store.domains.join(", ")}</p>
            {store.notes && (
              <p className="mt-2 line-clamp-2 text-xs text-gray-400 dark:text-gray-500">{store.notes}</p>
            )}

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => toggleActive(store)}
                disabled={busyId === store.id}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5"
              >
                {store.isActive ? "Désactiver" : "Activer"}
              </button>
              <button
                onClick={() => {
                  setEditing(store);
                  setShowForm(true);
                }}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5"
              >
                Modifier
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
