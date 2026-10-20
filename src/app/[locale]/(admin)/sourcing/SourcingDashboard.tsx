"use client";

import { Fragment, useState } from "react";
import { api } from "@/lib/apiClient";
import { IntentForm } from "@/components/tracecart/IntentForm";
import { SourcingRequestForm } from "@/components/tracecart/SourcingRequestForm";
import { Badge } from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { Alert } from "@/components/ui/alert/Alert";
import { KpiStrip } from "@/components/ui/kpi-strip/KpiStrip";
import { SegmentedTabs } from "@/components/ui/tabs/Tabs";
import { ExceptionCard } from "@/components/ui/exception-card/ExceptionCard";
import { SourcingRequestStatusTag } from "@/components/ui/status/Status";
import { DsPlusIcon } from "@/icons";
import { productPlaceholder } from "@/lib/placeholderImage";
import { Paginated, ProductSearchResponse, SearchResultItem, SourcingRequest } from "@/lib/types";

const PAGE_LIMIT = 100;

type Segment = "active" | "open" | "matched" | "done" | "all";

const SEGMENT_LABELS: Record<Segment, string> = {
  active: "En cours",
  open: "Ouvertes",
  matched: "Candidat choisi",
  done: "Terminées",
  all: "Toutes",
};

function inSegment(r: SourcingRequest, segment: Segment): boolean {
  if (segment === "all") return true;
  if (segment === "active") return r.status === "OPEN" || r.status === "MATCHED";
  if (segment === "open") return r.status === "OPEN";
  if (segment === "matched") return r.status === "MATCHED";
  return r.status === "CONVERTED" || r.status === "CLOSED";
}

function budget(r: SourcingRequest): string | null {
  const fmt = (v: string) => Number(v).toLocaleString("fr-FR");
  if (r.budgetMin && r.budgetMax) return `${fmt(r.budgetMin)}–${fmt(r.budgetMax)}`;
  if (r.budgetMax) return `≤ ${fmt(r.budgetMax)}`;
  if (r.budgetMin) return `≥ ${fmt(r.budgetMin)}`;
  return null;
}

const TH = "sticky top-0 whitespace-nowrap border-b border-line bg-surface-sunken px-3 py-2 text-left text-[12px] font-[650] uppercase tracking-[0.04em] text-ink-muted";
const TD = "border-b border-line px-3 py-2 align-middle";

/**
 * Sourcing on the TraceCartOps layout: ruled KPI strip, status segments over
 * a dense requests table whose rows open the catalogue candidates in place,
 * and the requests still without a candidate surfaced on the right.
 */

export function SourcingDashboard({
  initialRequests,
  initialTotal,
}: {
  initialRequests: SourcingRequest[];
  initialTotal: number;
}) {
  const [requests, setRequests] = useState<SourcingRequest[]>(initialRequests);
  const [total, setTotal] = useState(initialTotal);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [matchResults, setMatchResults] = useState<SearchResultItem[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [matchesError, setMatchesError] = useState<string | null>(null);
  const [selectingKey, setSelectingKey] = useState<string | null>(null);
  const [converting, setConverting] = useState<SourcingRequest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [segment, setSegment] = useState<Segment>("active");

  async function refresh() {
    const result = await api.get<Paginated<SourcingRequest>>(`/sourcing-requests?limit=${PAGE_LIMIT}`);
    setRequests(result.items);
    setTotal(result.total);
  }

  function handleCreated() {
    setShowForm(false);
    refresh();
  }

  async function toggleMatches(request: SourcingRequest) {
    if (expandedId === request.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(request.id);
    setMatchResults([]);
    setMatchesError(null);
    setMatchesLoading(true);
    try {
      const result = await api.get<ProductSearchResponse>(`/sourcing-requests/${request.id}/matches`);
      setMatchResults(result.results);
    } catch (err) {
      setMatchesError(err instanceof Error ? err.message : "Impossible de charger les candidats");
    } finally {
      setMatchesLoading(false);
    }
  }

  async function selectCandidate(request: SourcingRequest, item: SearchResultItem) {
    if (!item.productId) return;
    const key = item.productId;
    setSelectingKey(key);
    setError(null);
    try {
      await api.patch(`/sourcing-requests/${request.id}`, { selectedProductId: item.productId });
      setExpandedId(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de choisir ce produit");
    } finally {
      setSelectingKey(null);
    }
  }

  function handleConverted() {
    setConverting(null);
    refresh();
  }

  const counts: Record<Segment, number> = {
    active: requests.filter((r) => inSegment(r, "active")).length,
    open: requests.filter((r) => inSegment(r, "open")).length,
    matched: requests.filter((r) => inSegment(r, "matched")).length,
    done: requests.filter((r) => inSegment(r, "done")).length,
    all: requests.length,
  };
  const visible = requests.filter((r) => inSegment(r, segment));
  const needsDecision = requests.filter((r) => r.status === "OPEN");

  function openFromSide(request: SourcingRequest) {
    if (!inSegment(request, segment)) setSegment("active");
    if (expandedId !== request.id) toggleMatches(request);
    requestAnimationFrame(() => {
      const row = document.getElementById(`request-${request.id}`);
      const target = row && row.offsetParent !== null ? row : document.getElementById(`request-card-${request.id}`);
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  function actions(r: SourcingRequest) {
    return (
      <div className="flex flex-wrap justify-end gap-2">
        {r.status === "MATCHED" && r.selectedProduct && (
          <Button size="s" onClick={() => setConverting(r)}>
            Créer la commande
          </Button>
        )}
        {(r.status === "OPEN" || r.status === "MATCHED") && (
          <Button size="s" variant="secondary" onClick={() => toggleMatches(r)}>
            {expandedId === r.id ? "Masquer" : "Voir les candidats"}
          </Button>
        )}
        {r.order && (
          <Button size="s" variant="ghost" href={`/orders/${r.order.id}`}>
            {r.order.reference}
          </Button>
        )}
      </div>
    );
  }

  function detail(r: SourcingRequest) {
    return (
      <div className="grid gap-4">
        {r.status === "MATCHED" && r.selectedProduct && (
          <div className="flex items-center gap-3 rounded-[var(--radius-m)] bg-surface-sunken p-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={r.selectedProduct.imageUrl || productPlaceholder(r.selectedProduct.id)}
              alt=""
              className="h-10 w-10 rounded-[var(--radius-s)] object-cover"
            />
            <p className="line-clamp-1 text-sm text-ink">
              <span className="text-ink-muted">Candidat choisi · </span>
              {r.selectedProduct.title}
            </p>
          </div>
        )}
        {matchesLoading && <p className="text-sm text-ink-muted">Recherche de candidats...</p>}
        {matchesError && <p className="text-sm text-critical">{matchesError}</p>}
        {!matchesLoading && !matchesError && matchResults.length === 0 && (
          <p className="text-sm text-ink-muted">Aucun candidat trouvé dans le catalogue pour cette demande.</p>
        )}
        {matchResults.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {matchResults.map((item) => {
              const key = item.productId ?? item.externalId ?? item.url;
              return (
                <div key={key} className="flex flex-col overflow-hidden rounded-[var(--radius-m)] border border-line bg-surface-raised">
                  <div className="relative aspect-square w-full overflow-hidden bg-surface-sunken">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.imageUrl || productPlaceholder(key)} alt="" className="h-full w-full object-cover" />
                  </div>
                  <div className="flex flex-1 flex-col p-2.5">
                    <p className="line-clamp-2 flex-1 text-xs font-medium text-ink">{item.title ?? "Produit sans titre"}</p>
                    {item.price != null && (
                      <p className="mt-1.5 text-sm font-semibold tabular-nums text-ink">
                        {item.price.toLocaleString("fr-FR")} <span className="text-xs font-normal text-ink-muted">{item.currency}</span>
                      </p>
                    )}
                    <Button
                      size="s"
                      variant="secondary"
                      block
                      className="mt-2"
                      onClick={() => selectCandidate(r, item)}
                      disabled={!item.productId || selectingKey === key}
                      loading={selectingKey === key}
                    >
                      Choisir ce produit
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="rb-headline text-[32px]">Sourcing</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Ce que les clients recherchent, avant même d&apos;avoir trouvé un lien produit précis.
          </p>
        </div>
        {!showForm && (
          <Button startIcon={<DsPlusIcon width={18} height={18} />} onClick={() => setShowForm(true)}>
            Nouvelle demande
          </Button>
        )}
      </div>

      <KpiStrip
        className="mt-6"
        items={[
          { key: "total", value: total, label: "Demandes" },
          { key: "open", value: counts.open, label: "Ouvertes" },
          { key: "matched", value: counts.matched, label: "Candidat choisi" },
          { key: "converted", value: requests.filter((r) => r.status === "CONVERTED").length, label: "Transformées" },
        ]}
      />

      {error && <Alert tone="critical" title={error} className="mt-6" />}

      {showForm && (
        <div className="mt-6">
          <SourcingRequestForm onCreated={handleCreated} onCancel={() => setShowForm(false)} />
        </div>
      )}

      {converting?.selectedProduct && (
        <div className="mt-6">
          <IntentForm
            onCreated={handleConverted}
            onCancel={() => setConverting(null)}
            initialProduct={{
              url: converting.selectedProduct.canonicalUrl,
              name: converting.selectedProduct.title,
              imageUrl: converting.selectedProduct.imageUrl ?? undefined,
              provider: null,
              sourcingRequestId: converting.id,
            }}
          />
        </div>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">
          <SegmentedTabs
            label="Statut"
            className="mb-3"
            value={segment}
            onChange={setSegment}
            tabs={(Object.keys(SEGMENT_LABELS) as Segment[]).map((id) => ({ id, label: SEGMENT_LABELS[id], count: counts[id] }))}
          />

          {visible.length === 0 ? (
            <p className="text-sm text-ink-muted">
              {requests.length === 0 ? "Aucune demande pour le moment." : `Aucune demande « ${SEGMENT_LABELS[segment].toLowerCase()} ».`}
            </p>
          ) : (
            <>
              {/* sm and up: dense table, a row opens its candidates in place */}
              <div className="hidden w-full overflow-x-auto rounded-[var(--radius-m)] border border-line bg-surface-raised sm:block">
                <table className="w-full min-w-[760px] border-separate border-spacing-0 text-sm leading-5">
                  <caption className="sr-only">Demandes de sourcing — {SEGMENT_LABELS[segment]}</caption>
                  <thead>
                    <tr>
                      <th scope="col" className={TH}>Client</th>
                      <th scope="col" className={TH}>Demande</th>
                      <th scope="col" className={TH}>Destination</th>
                      <th scope="col" className={`${TH} text-right`}>Qté · budget</th>
                      <th scope="col" className={TH}>Statut</th>
                      <th scope="col" className={`${TH} text-right`}>
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((r, i) => {
                      const open = expandedId === r.id;
                      const last = i === visible.length - 1;
                      const td = `${TD} ${last && !open ? "border-b-0" : ""}`;
                      return (
                        <Fragment key={r.id}>
                          <tr id={`request-${r.id}`} className={open ? "bg-accent-soft" : "bg-surface-raised"}>
                            <td className={td}>
                              <b className="font-semibold">{r.customerName}</b>
                              <span className="rb-mono block text-[12px] text-ink-muted">{r.customerPhone}</span>
                            </td>
                            <td className={`${td} max-w-[360px]`}>
                              <span className="line-clamp-2">{r.description}</span>
                              {(r.category || r.brand) && (
                                <span className="block text-[13px] text-ink-muted">{[r.category, r.brand].filter(Boolean).join(" · ")}</span>
                              )}
                            </td>
                            <td className={`${td} whitespace-nowrap`}>
                              {r.destinationCity}
                              <span className="block text-[13px] text-ink-muted">{r.destinationCountry}</span>
                            </td>
                            <td className={`${td} whitespace-nowrap text-right tabular-nums`}>
                              {r.quantity.toLocaleString("fr-FR")}
                              <span className="block text-[13px] text-ink-muted">{budget(r) ?? "—"}</span>
                            </td>
                            <td className={td}>
                              <SourcingRequestStatusTag status={r.status} />
                            </td>
                            <td className={td}>{actions(r)}</td>
                          </tr>
                          {open && (
                            <tr>
                              <td colSpan={6} className={`${TD} ${last ? "border-b-0" : ""} bg-surface-raised px-4 py-5`}>
                                {detail(r)}
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Below sm: a card list */}
              <ul className="grid gap-2 sm:hidden" aria-label={`Demandes de sourcing — ${SEGMENT_LABELS[segment]}`}>
                {visible.map((r) => (
                  <li
                    key={r.id}
                    id={`request-card-${r.id}`}
                    className={`rounded-[var(--radius-m)] border bg-surface-raised p-4 ${
                      expandedId === r.id ? "border-ink shadow-[inset_0_0_0_1px_var(--color-ink)]" : "border-line"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <b className="font-semibold">{r.customerName}</b>
                      <SourcingRequestStatusTag status={r.status} />
                    </div>
                    <p className="mt-1 line-clamp-3 text-sm text-ink">{r.description}</p>
                    <p className="mt-1 text-[13px] text-ink-muted">
                      {r.destinationCity}, {r.destinationCountry} · qté {r.quantity}
                      {budget(r) ? ` · ${budget(r)}` : ""}
                    </p>
                    <div className="mt-3">{actions(r)}</div>
                    {expandedId === r.id && <div className="mt-4 border-t border-line pt-4">{detail(r)}</div>}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <aside className="grid content-start gap-3" aria-label="Sans candidat">
          <div className="flex items-center justify-between">
            <h2 className="rb-title">Sans candidat</h2>
            {needsDecision.length > 0 && <Badge variant="attn">{needsDecision.length}</Badge>}
          </div>
          {needsDecision.length === 0 ? (
            <p className="text-sm text-ink-muted">Aucune demande sans candidat pour le moment.</p>
          ) : (
            needsDecision.map((r) => (
              <ExceptionCard
                key={r.id}
                severity="held"
                title={r.customerName}
                meta={`${r.destinationCity} · qté ${r.quantity}`}
                actions={
                  <Button size="s" variant="secondary" onClick={() => openFromSide(r)}>
                    Voir les candidats
                  </Button>
                }
              >
                {r.description.length > 120 ? `${r.description.slice(0, 120)}…` : r.description}
              </ExceptionCard>
            ))
          )}
        </aside>
      </div>
    </div>
  );
}
