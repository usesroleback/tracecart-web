"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { api } from "@/lib/apiClient";
import { StoreForm } from "@/components/tracecart/StoreForm";
import { Badge } from "@/components/ui/badge/Badge";
import { KpiStrip } from "@/components/ui/kpi-strip/KpiStrip";
import Button from "@/components/ui/button/Button";
import { PanelShell } from "@/components/tracecart/PanelShell";
import { RankingBars } from "@/components/charts/RankingBars";
import { DsPlusIcon } from "@/icons";
import { fetchBreakdown } from "@/lib/kpi/adapter";
import { Breakdown } from "@/lib/kpi/types";
import { Provider } from "@/lib/types";

const RANKING_RANGE_DAYS = 90;

const TH = "sticky top-0 whitespace-nowrap border-b border-line bg-surface-sunken px-3 py-2 text-left text-[12px] font-[650] uppercase tracking-[0.04em] text-ink-muted";
const TD = "border-b border-line px-3 py-2 align-middle";

/**
 * Stores on the console layout: ruled counts instead of a gauge (the
 * system's "calm, not a cockpit"), a dense table of stores, and orders per
 * store beside it. A disabled store says so in its status instead of fading.
 */
export function StoresDashboard({ initialStores }: { initialStores: Provider[] }) {
  const t = useTranslations("stores");
  const tl = useTranslations("labels");
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
        if (!cancelled) setRankingError(err instanceof Error ? err.message : t("rankingFailed"));
      })
      .finally(() => {
        if (!cancelled) setRankingLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

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
  const typeLabel = (s: Provider) => (s.type === "LOCAL_MARKETPLACE" ? t("type.local") : t("type.intl"));

  function storeActions(store: Provider) {
    return (
      <div className="flex justify-end gap-2">
        <Button
          variant="secondary"
          size="s"
          onClick={() => {
            setEditing(store);
            setShowForm(true);
          }}
        >
          {t("edit")}
        </Button>
        <Button variant="ghost" size="s" onClick={() => toggleActive(store)} loading={busyId === store.id}>
          {store.isActive ? t("disable") : t("enable")}
        </Button>
      </div>
    );
  }

  function storeMark(store: Provider) {
    return (
      <span className="flex h-9 w-9 flex-none items-center justify-center rounded-[var(--radius-s)] bg-surface-sunken p-1.5">
        {store.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={store.logoUrl} alt="" className="h-full w-full object-contain" />
        ) : (
          <span className="text-xs font-semibold text-ink-muted">{store.name.slice(0, 2).toUpperCase()}</span>
        )}
      </span>
    );
  }

  const statusBadge = (store: Provider) =>
    store.isActive ? <Badge variant="positive">{t("active")}</Badge> : <Badge variant="outline">{t("disabled")}</Badge>;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="rb-headline text-[32px]">{t("title")}</h1>
          <p className="mt-1 text-sm text-ink-muted">{t("subtitle")}</p>
        </div>
        <Button
          startIcon={showForm && !editing ? undefined : <DsPlusIcon width={18} height={18} />}
          onClick={() => {
            setEditing(null);
            setShowForm((v) => !v);
          }}
        >
          {showForm && !editing ? t("close") : t("new")}
        </Button>
      </div>

      <KpiStrip
        className="mt-6"
        items={[
          { key: "active", value: activeCount, label: t("kpi.active"), note: t("kpi.of", { total: stores.length }) },
          { key: "inactive", value: stores.length - activeCount, label: t("kpi.disabled") },
          { key: "local", value: stores.filter((s) => s.type === "LOCAL_MARKETPLACE").length, label: t("kpi.local") },
          { key: "intl", value: stores.filter((s) => s.type !== "LOCAL_MARKETPLACE").length, label: t("kpi.intl") },
        ]}
      />

      {showForm && (
        <div className="mt-6">
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

      <div className="mt-6 grid gap-6 @min-[1104px]/main:grid-cols-[minmax(0,1fr)_400px]">
        <div className="min-w-0">
          {stores.length === 0 ? (
            <p className="text-sm text-ink-muted">{t("empty")}</p>
          ) : (
            <>
              <div tabIndex={0} className="hidden w-full overflow-x-auto rounded-[var(--radius-m)] border border-line bg-surface-raised sm:block">
                <table className="w-full min-w-[680px] border-separate border-spacing-0 text-sm leading-5">
                  <caption className="sr-only">{t("caption")}</caption>
                  <thead>
                    <tr>
                      <th scope="col" className={TH}>{t("th.store")}</th>
                      <th scope="col" className={TH}>{t("th.type")}</th>
                      <th scope="col" className={TH}>{t("th.domains")}</th>
                      <th scope="col" className={TH}>{t("th.status")}</th>
                      <th scope="col" className={TH}>
                        <span className="sr-only">{t("th.actions")}</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {stores.map((store, i) => {
                      const td = `${TD} ${i === stores.length - 1 ? "border-b-0" : ""}`;
                      return (
                        <tr key={store.id}>
                          <td className={td}>
                            <span className="flex items-center gap-3">
                              {storeMark(store)}
                              <span className="min-w-0">
                                <b className="font-semibold">{store.name}</b>
                                {store.notes && <span className="block max-w-[280px] truncate text-[13px] text-ink-muted">{store.notes}</span>}
                              </span>
                            </span>
                          </td>
                          <td className={`${td} whitespace-nowrap`}>
                            {typeLabel(store)}
                            <span className="block text-[13px] text-ink-muted">{store.defaultCurrency}</span>
                          </td>
                          <td className={`${td} max-w-[260px]`}>
                            <span className="rb-mono-s block truncate text-ink-muted">{store.domains.join(", ")}</span>
                          </td>
                          <td className={td}>{statusBadge(store)}</td>
                          <td className={td}>{storeActions(store)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <ul className="grid grid-cols-[minmax(0,1fr)] gap-2 sm:hidden" aria-label={t("caption")}>
                {stores.map((store) => (
                  <li key={store.id} className="rounded-[var(--radius-m)] border border-line bg-surface-raised p-4">
                    <div className="flex items-center gap-3">
                      {storeMark(store)}
                      <b className="min-w-0 flex-1 truncate font-semibold">{store.name}</b>
                      {statusBadge(store)}
                    </div>
                    <p className="mt-2 text-[13px] text-ink-muted">
                      {typeLabel(store)} · {store.defaultCurrency}
                    </p>
                    <p className="rb-mono-s mt-0.5 truncate text-ink-muted">{store.domains.join(", ")}</p>
                    <div className="mt-3">{storeActions(store)}</div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <PanelShell
          title={t("ranking.title")}
          loading={rankingLoading}
          error={rankingError}
          empty={!!ranking && ranking.slices.length === 0}
          emptyLabel={t("ranking.empty")}
        >
          {ranking && (
            <RankingBars items={ranking.slices.map((s) => ({ key: s.key, label: s.key === "unassigned" ? tl("unassigned") : s.label, value: s.count, logoUrl: s.logoUrl }))} />
          )}
        </PanelShell>
      </div>
    </div>
  );
}
