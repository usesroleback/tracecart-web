"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/apiClient";
import Button from "@/components/ui/button/Button";
import { Card } from "@/components/ui/card/Card";
import { DsSearchIcon } from "@/icons";
import { productPlaceholder } from "@/lib/placeholderImage";
import {
  Provider,
  ProductSearchResponse,
  SearchFacets,
  SearchFilters,
  SearchPagination,
  SearchResultItem,
} from "@/lib/types";

// Sent when the admin hasn't typed anything yet, so the page shows a general
// catalog listing instead of an empty state.
const DEFAULT_QUERY = " ";

const EMPTY_FACETS: SearchFacets = { categories: [], brands: [], priceRange: null };
const EMPTY_PAGINATION: SearchPagination = { page: 1, totalResults: null, hasMore: false };

export function ProductSearch({ providers }: { providers: Provider[] }) {
  const [providerId, setProviderId] = useState(providers[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [facets, setFacets] = useState<SearchFacets>(EMPTY_FACETS);
  const [pagination, setPagination] = useState<SearchPagination>(EMPTY_PAGINATION);
  const [supported, setSupported] = useState(true);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reservingKey, setReservingKey] = useState<string | null>(null);
  const [reservedKeys, setReservedKeys] = useState<Set<string>>(new Set());

  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");

  const selectedProvider = providers.find((p) => p.id === providerId) ?? null;

  async function runSearch(providerToUse: Provider | null, q: string, filters: SearchFilters) {
    if (!providerToUse) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ provider: providerToUse.slug, q });
      if (filters.category) params.set("category", filters.category);
      if (filters.brand) params.set("brand", filters.brand);
      if (filters.priceMin != null) params.set("priceMin", String(filters.priceMin));
      if (filters.priceMax != null) params.set("priceMax", String(filters.priceMax));
      if (filters.page && filters.page > 1) params.set("page", String(filters.page));

      const result = await api.get<ProductSearchResponse>(`/providers/search?${params.toString()}`);
      setResults(result.results);
      setFacets(result.facets ?? EMPTY_FACETS);
      setPagination(result.pagination ?? EMPTY_PAGINATION);
      setSupported(result.supported);
      setSearched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "La recherche a échoué");
    } finally {
      setLoading(false);
    }
  }

  function currentFilters(): SearchFilters {
    return {
      category: category || undefined,
      brand: brand || undefined,
      priceMin: priceMin ? Number(priceMin) : undefined,
      priceMax: priceMax ? Number(priceMax) : undefined,
    };
  }

  // Show a general listing as soon as a supported store is selected, before the admin types anything.
  useEffect(() => {
    setResults([]);
    setSearched(false);
    setCategory("");
    setBrand("");
    setPriceMin("");
    setPriceMax("");
    runSearch(selectedProvider, query.trim() || DEFAULT_QUERY, {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerId]);

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    runSearch(selectedProvider, query.trim() || DEFAULT_QUERY, currentFilters());
  }

  function toggleCategory(value: string) {
    const next = category === value ? "" : value;
    setCategory(next);
    // Category and brand are mutually exclusive on Jumia (both are URL path segments).
    setBrand("");
    runSearch(selectedProvider, query.trim() || DEFAULT_QUERY, { ...currentFilters(), category: next, brand: undefined, page: 1 });
  }

  function handleBrandChange(value: string) {
    setBrand(value);
    setCategory("");
    runSearch(selectedProvider, query.trim() || DEFAULT_QUERY, {
      ...currentFilters(),
      brand: value || undefined,
      category: undefined,
      page: 1,
    });
  }

  function applyPriceRange() {
    runSearch(selectedProvider, query.trim() || DEFAULT_QUERY, { ...currentFilters(), page: 1 });
  }

  function goToPage(page: number) {
    runSearch(selectedProvider, query.trim() || DEFAULT_QUERY, { ...currentFilters(), page });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleReserve(item: SearchResultItem) {
    const key = item.externalId ?? item.url;
    setReservingKey(key);
    setError(null);
    try {
      await api.post("/reservations", {
        providerId: selectedProvider?.id,
        externalId: item.externalId,
        url: item.url,
        title: item.title,
        imageUrl: item.imageUrl,
        price: item.price,
        currency: item.currency,
      });
      setReservedKeys((prev) => new Set(prev).add(key));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de réserver ce produit");
    } finally {
      setReservingKey(null);
    }
  }

  const hasFilters = facets.categories.length > 0 || facets.brands.length > 0 || facets.priceRange != null;

  return (
    <div>
      <div className="mb-6">
        <p className="sq-overline">Sourcing produits</p>
        <h1 className="sq-headline text-[32px]">Rechercher &amp; réserver</h1>
        <p className="mt-1.5 max-w-xl text-sm text-ink-muted">
          Parcourez une boutique ou cherchez un produit, puis réservez-le pour le retrouver dans{" "}
          <Link href="/reservations" className="text-accent-ink underline">
            Réservations
          </Link>
          .
        </p>
      </div>

      <div className="mb-6">
        <p className="sq-overline mb-2.5">Boutique</p>
        <div className="flex flex-wrap gap-2.5">
          {providers.map((p) => {
            const active = p.id === providerId;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setProviderId(p.id)}
                className={`flex items-center gap-2.5 rounded-[var(--radius-s)] border px-4 py-2.5 text-sm font-medium transition ${
                  active
                    ? "border-ink bg-surface-sunken text-ink"
                    : "border-line bg-surface-raised text-ink-muted hover:border-line-strong hover:bg-surface-sunken"
                }`}
              >
                {p.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.logoUrl} alt="" className="h-5 w-5 object-contain" />
                ) : (
                  <span className="flex h-5 w-5 items-center justify-center rounded-[var(--radius-xs)] bg-surface-sunken text-[10px] font-semibold text-ink-muted">
                    {p.name.slice(0, 1)}
                  </span>
                )}
                {p.name}
              </button>
            );
          })}
        </div>
      </div>

      <form onSubmit={handleSearch} className="mb-4 flex gap-2">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted">
            <DsSearchIcon />
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Rechercher chez ${selectedProvider?.name ?? "une boutique"}...`}
            className="h-12 w-full rounded-[var(--radius-s)] border border-line-strong bg-surface-raised pl-11 pr-4 text-sm text-ink placeholder:text-ink-muted focus:outline-2 focus:outline-offset-2 focus:outline-focus-ring"
          />
        </div>
        <Button type="submit" size="l" disabled={!selectedProvider} loading={loading}>
          Rechercher
        </Button>
      </form>

      {hasFilters && (
        <Card className="mb-8 space-y-3">
          {facets.categories.length > 0 && (
            <div>
              <p className="sq-overline mb-1.5">Catégorie</p>
              <div className="flex flex-wrap gap-1.5">
                {facets.categories.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => toggleCategory(c.value)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                      category === c.value
                        ? "border-ink bg-ink text-ink-inverse"
                        : "border-line text-ink-muted hover:bg-surface-sunken"
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-end gap-4">
            {facets.brands.length > 0 && (
              <label className="text-sm">
                <span className="sq-overline mb-1 block">Marque</span>
                <select
                  value={brand}
                  onChange={(e) => handleBrandChange(e.target.value)}
                  className="h-9 rounded-[var(--radius-s)] border border-line-strong bg-surface-raised px-3 text-sm text-ink"
                >
                  <option value="">Toutes les marques</option>
                  {facets.brands.map((b) => (
                    <option key={b.value} value={b.value}>
                      {b.label}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {facets.priceRange && (
              <div className="text-sm">
                <span className="sq-overline mb-1 block">
                  Prix ({selectedProvider?.defaultCurrency}, {facets.priceRange.min.toLocaleString("fr-FR")}–{facets.priceRange.max.toLocaleString("fr-FR")})
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={facets.priceRange.min}
                    max={facets.priceRange.max}
                    value={priceMin}
                    onChange={(e) => setPriceMin(e.target.value)}
                    placeholder="Min"
                    className="h-9 w-24 rounded-[var(--radius-s)] border border-line-strong bg-surface-raised px-2.5 text-sm text-ink"
                  />
                  <span className="text-ink-muted">–</span>
                  <input
                    type="number"
                    min={facets.priceRange.min}
                    max={facets.priceRange.max}
                    value={priceMax}
                    onChange={(e) => setPriceMax(e.target.value)}
                    placeholder="Max"
                    className="h-9 w-24 rounded-[var(--radius-s)] border border-line-strong bg-surface-raised px-2.5 text-sm text-ink"
                  />
                  <Button type="button" variant="secondary" size="s" onClick={applyPriceRange}>
                    Appliquer
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {error && <p className="mb-4 rounded-[var(--radius-s)] bg-critical-soft px-3 py-2 text-sm text-critical">{error}</p>}

      {searched && !supported && (
        <div className="rounded-[var(--radius-m)] border border-dashed border-line-strong bg-surface-raised p-8 text-center">
          <p className="text-sm font-medium text-ink">
            Recherche indisponible pour {selectedProvider?.name}
          </p>
          <p className="mx-auto mt-1 max-w-md text-xs text-ink-muted">
            {selectedProvider?.notes ?? "Cette boutique ne propose pas de recherche par mot-clé pour le moment."}
          </p>
          <Link
            href="/orders"
            className="mt-3 inline-block text-xs font-medium text-accent-ink underline"
          >
            Coller un lien produit dans une nouvelle commande
          </Link>
        </div>
      )}

      {searched && supported && results.length === 0 && !loading && (
        <p className="text-sm text-ink-muted">Aucun résultat pour cette recherche.</p>
      )}

      {results.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {results.map((item) => {
            const key = item.externalId ?? item.url;
            const isReserved = reservedKeys.has(key);
            return (
              <Card key={key} as="div" className="group flex flex-col overflow-hidden p-0! transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-1)]">
                <div className="relative aspect-square w-full overflow-hidden bg-surface-sunken">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.imageUrl || productPlaceholder(key)}
                    alt=""
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                  {selectedProvider?.logoUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={selectedProvider.logoUrl}
                      alt=""
                      className="absolute left-2 top-2 h-6 w-6 rounded-[var(--radius-s)] bg-surface-raised/90 object-contain p-1 shadow-[var(--shadow-1)]"
                    />
                  )}
                </div>
                <div className="flex flex-1 flex-col p-3.5">
                  <p className="line-clamp-2 flex-1 text-sm font-medium text-ink">
                    {item.title ?? "Produit sans titre"}
                  </p>
                  {item.price != null && (
                    <p className="mt-2 text-base font-semibold text-accent-ink">
                      {item.price.toLocaleString("fr-FR")}{" "}
                      <span className="text-xs font-normal text-ink-muted">{item.currency} · prix source, à titre indicatif</span>
                    </p>
                  )}
                  {isReserved ? (
                    <button
                      disabled
                      className="mt-3 w-full rounded-[var(--radius-s)] bg-positive-soft py-2 text-xs font-semibold text-positive"
                    >
                      Réservé ✓
                    </button>
                  ) : (
                    <Button
                      size="s"
                      block
                      className="mt-3"
                      onClick={() => handleReserve(item)}
                      loading={reservingKey === key}
                    >
                      Réserver
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {results.length > 0 && (pagination.page > 1 || pagination.hasMore) && (
        <div className="mt-6 flex items-center justify-between">
          <Button
            type="button"
            variant="secondary"
            onClick={() => goToPage(pagination.page - 1)}
            disabled={loading || pagination.page <= 1}
          >
            ← Précédent
          </Button>
          <span className="text-xs text-ink-muted">
            Page {pagination.page}
            {pagination.totalResults != null && ` · ${pagination.totalResults.toLocaleString("fr-FR")} résultats`}
          </span>
          <Button
            type="button"
            variant="secondary"
            onClick={() => goToPage(pagination.page + 1)}
            disabled={loading || !pagination.hasMore}
          >
            Suivant →
          </Button>
        </div>
      )}
    </div>
  );
}
