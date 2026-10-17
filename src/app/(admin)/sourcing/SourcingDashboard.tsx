"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/apiClient";
import { IntentForm } from "@/components/kaya/IntentForm";
import { SourcingRequestForm } from "@/components/kaya/SourcingRequestForm";
import { PillTone, StatusPill } from "@/components/kaya/StatusPill";
import { productPlaceholder } from "@/lib/placeholderImage";
import { Paginated, ProductSearchResponse, SearchResultItem, SourcingRequest, SourcingRequestStatus } from "@/lib/types";

const PAGE_LIMIT = 100;

const STATUS_TONE: Record<SourcingRequestStatus, PillTone> = {
  OPEN: "warning",
  MATCHED: "neutral",
  CONVERTED: "success",
  CLOSED: "error",
};

const STATUS_LABELS: Record<SourcingRequestStatus, string> = {
  OPEN: "Ouverte",
  MATCHED: "Candidat choisi",
  CONVERTED: "Transformée",
  CLOSED: "Clôturée",
};

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

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-800 dark:text-white/90">Demandes de sourcing</h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            Ce que les clients recherchent, avant même d&apos;avoir trouvé un lien produit précis.
          </p>
          {total > requests.length && (
            <p className="mt-1 text-xs text-gray-400">
              Affichage des {requests.length} plus récentes sur {total} au total.
            </p>
          )}
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="whitespace-nowrap rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            Nouvelle demande
          </button>
        )}
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-error-50 px-3 py-2 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
          {error}
        </p>
      )}

      {showForm && (
        <div className="mb-6">
          <SourcingRequestForm onCreated={handleCreated} onCancel={() => setShowForm(false)} />
        </div>
      )}

      {converting?.selectedProduct && (
        <div className="mb-6">
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

      <div className="mb-8">
        <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          En cours <StatusPill tone="warning" label={String(open.length)} />
        </p>
        {open.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Aucune demande en cours.</p>
        ) : (
          <div className="space-y-4">
            {open.map((r) => (
              <div
                key={r.id}
                className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-800 dark:text-white/90">{r.customerName}</p>
                      <StatusPill tone={STATUS_TONE[r.status]} label={STATUS_LABELS[r.status]} />
                    </div>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{r.description}</p>
                    <p className="mt-1 text-xs text-gray-400">
                      {r.destinationCity}, {r.destinationCountry} · qté {r.quantity}
                      {r.budgetMax && ` · budget ≤ ${Number(r.budgetMax).toLocaleString("fr-FR")}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {r.status === "MATCHED" && r.selectedProduct && (
                      <button
                        onClick={() => setConverting(r)}
                        className="whitespace-nowrap rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-700"
                      >
                        Créer la commande
                      </button>
                    )}
                    <button
                      onClick={() => toggleMatches(r)}
                      className="whitespace-nowrap rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5"
                    >
                      {expandedId === r.id ? "Masquer" : "Voir les candidats"}
                    </button>
                  </div>
                </div>

                {r.status === "MATCHED" && r.selectedProduct && (
                  <div className="mt-3 flex items-center gap-3 rounded-xl bg-gray-50 p-2.5 dark:bg-white/5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={r.selectedProduct.imageUrl || productPlaceholder(r.selectedProduct.id)}
                      alt=""
                      className="h-10 w-10 rounded-lg object-cover"
                    />
                    <p className="line-clamp-1 text-sm text-gray-700 dark:text-gray-200">{r.selectedProduct.title}</p>
                  </div>
                )}

                {expandedId === r.id && (
                  <div className="mt-4 border-t border-gray-100 pt-4 dark:border-gray-800">
                    {matchesLoading && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">Recherche de candidats...</p>
                    )}
                    {matchesError && <p className="text-sm text-error-600 dark:text-error-400">{matchesError}</p>}
                    {!matchesLoading && !matchesError && matchResults.length === 0 && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Aucun candidat trouvé dans le catalogue pour cette demande.
                      </p>
                    )}
                    {matchResults.length > 0 && (
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {matchResults.map((item) => {
                          const key = item.productId ?? item.externalId ?? item.url;
                          return (
                            <div
                              key={key}
                              className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.02]"
                            >
                              <div className="relative aspect-square w-full overflow-hidden bg-gray-50 dark:bg-white/5">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={item.imageUrl || productPlaceholder(key)}
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
                              </div>
                              <div className="flex flex-1 flex-col p-2.5">
                                <p className="line-clamp-2 flex-1 text-xs font-medium text-gray-800 dark:text-white/90">
                                  {item.title ?? "Produit sans titre"}
                                </p>
                                {item.price != null && (
                                  <p className="mt-1.5 text-sm font-semibold text-brand-700 dark:text-brand-400">
                                    {item.price.toLocaleString("fr-FR")}{" "}
                                    <span className="text-xs font-normal text-gray-400">{item.currency}</span>
                                  </p>
                                )}
                                <button
                                  onClick={() => selectCandidate(r, item)}
                                  disabled={!item.productId || selectingKey === key}
                                  className="mt-2 w-full rounded-lg bg-brand-600 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
                                >
                                  {selectingKey === key ? "..." : "Choisir ce produit"}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {closed.length > 0 && (
        <div>
          <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Terminées <StatusPill tone="neutral" label={String(closed.length)} />
          </p>
          <div className="space-y-2">
            {closed.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm dark:border-gray-800 dark:bg-white/[0.03]"
              >
                <span className="text-gray-600 dark:text-gray-300">
                  {r.customerName} — {r.description}
                </span>
                {r.order ? (
                  <Link href="/orders" className="font-medium text-brand-600 hover:underline dark:text-brand-400">
                    {r.order.reference}
                  </Link>
                ) : (
                  <StatusPill tone={STATUS_TONE[r.status]} label={STATUS_LABELS[r.status]} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
