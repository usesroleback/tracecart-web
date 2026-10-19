"use client";

import { useState } from "react";
import { Link } from '@/i18n/navigation';
import { api } from "@/lib/apiClient";
import { IntentForm } from "@/components/tracecart/IntentForm";
import { SourcingRequestForm } from "@/components/tracecart/SourcingRequestForm";
import { Badge } from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { Card } from "@/components/ui/card/Card";
import { ExceptionCard } from "@/components/ui/exception-card/ExceptionCard";
import { SourcingRequestStatusTag } from "@/components/ui/status/Status";
import { productPlaceholder } from "@/lib/placeholderImage";
import { Paginated, ProductSearchResponse, SearchResultItem, SourcingRequest } from "@/lib/types";

const PAGE_LIMIT = 100;

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

  const open = requests.filter((r) => r.status === "OPEN" || r.status === "MATCHED");
  const closed = requests.filter((r) => r.status === "CONVERTED" || r.status === "CLOSED");
  const needsDecision = requests.filter((r) => r.status === "OPEN");

  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="sq-headline text-[32px]">Sourcing</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Ce que les clients recherchent, avant même d&apos;avoir trouvé un lien produit précis.
          </p>
        </div>
        {!showForm && <Button onClick={() => setShowForm(true)}>Nouvelle demande</Button>}
      </div>

      <div className="mt-6 grid grid-cols-2 border-t-[var(--border-strong)] border-b border-t-ink border-b-line sm:grid-cols-4">
        {[
          { label: "Demandes", value: total },
          { label: "Ouvertes", value: requests.filter((r) => r.status === "OPEN").length },
          { label: "Candidat choisi", value: requests.filter((r) => r.status === "MATCHED").length },
          { label: "Transformées", value: requests.filter((r) => r.status === "CONVERTED").length },
        ].map((k, i) => (
          <div key={k.label} className={`py-4 pr-4 ${i > 0 ? "border-l border-line pl-4" : ""}`}>
            <p className="sq-numeral-l text-[32px]">{k.value}</p>
            <p className="mt-1 text-[13px] text-ink-muted">{k.label}</p>
          </div>
        ))}
      </div>

      {error && (
        <p className="mt-6 rounded-[var(--radius-s)] bg-critical-soft px-3 py-2 text-sm text-critical">{error}</p>
      )}

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

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div>
          <p className="sq-overline mb-3">En cours ({open.length})</p>
          {open.length === 0 ? (
            <p className="text-sm text-ink-muted">Aucune demande en cours.</p>
          ) : (
            <div className="space-y-4">
              {open.map((r) => (
                <Card key={r.id}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-ink">{r.customerName}</p>
                        <SourcingRequestStatusTag status={r.status} />
                      </div>
                      <p className="mt-1 text-sm text-ink-muted">{r.description}</p>
                      <p className="mt-1 text-xs text-ink-muted">
                        {r.destinationCity}, {r.destinationCountry} · qté {r.quantity}
                        {r.budgetMax && ` · budget ≤ ${Number(r.budgetMax).toLocaleString("fr-FR")}`}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      {r.status === "MATCHED" && r.selectedProduct && (
                        <Button size="s" onClick={() => setConverting(r)}>
                          Créer la commande
                        </Button>
                      )}
                      <Button size="s" variant="secondary" onClick={() => toggleMatches(r)}>
                        {expandedId === r.id ? "Masquer" : "Voir les candidats"}
                      </Button>
                    </div>
                  </div>

                  {r.status === "MATCHED" && r.selectedProduct && (
                    <div className="mt-3 flex items-center gap-3 rounded-[var(--radius-m)] bg-surface-sunken p-2.5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={r.selectedProduct.imageUrl || productPlaceholder(r.selectedProduct.id)}
                        alt=""
                        className="h-10 w-10 rounded-[var(--radius-s)] object-cover"
                      />
                      <p className="line-clamp-1 text-sm text-ink">{r.selectedProduct.title}</p>
                    </div>
                  )}

                  {expandedId === r.id && (
                    <div className="mt-4 border-t border-line pt-4">
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
                                    <p className="mt-1.5 text-sm font-semibold text-accent-ink">
                                      {item.price.toLocaleString("fr-FR")} <span className="text-xs font-normal text-ink-muted">{item.currency}</span>
                                    </p>
                                  )}
                                  <Button
                                    size="s"
                                    block
                                    className="mt-2"
                                    onClick={() => selectCandidate(r, item)}
                                    disabled={!item.productId || selectingKey === key}
                                  >
                                    {selectingKey === key ? "..." : "Choisir ce produit"}
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}

          {closed.length > 0 && (
            <div className="mt-8">
              <p className="sq-overline mb-3">Terminées ({closed.length})</p>
              <div className="space-y-2">
                {closed.map((r) => (
                  <div key={r.id} className="flex items-center justify-between rounded-[var(--radius-m)] border border-line bg-surface-raised px-4 py-2.5 text-sm">
                    <span className="text-ink-muted">
                      {r.customerName} — {r.description}
                    </span>
                    {r.order ? (
                      <Link href="/orders" className="sq-link">
                        {r.order.reference}
                      </Link>
                    ) : (
                      <SourcingRequestStatusTag status={r.status} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="grid content-start gap-3">
          <div className="flex items-center justify-between">
            <h2 className="sq-title">Besoin d&apos;une action</h2>
            <Badge variant="attn">{needsDecision.length}</Badge>
          </div>
          {needsDecision.length === 0 ? (
            <p className="text-sm text-ink-muted">Aucune demande sans candidat pour le moment.</p>
          ) : (
            needsDecision.map((r) => (
              <ExceptionCard
                key={r.id}
                severity="held"
                title={r.customerName}
                meta={`${r.description.slice(0, 48)}${r.description.length > 48 ? "…" : ""}`}
                actions={
                  <Button size="s" onClick={() => toggleMatches(r)}>
                    Voir les candidats
                  </Button>
                }
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
