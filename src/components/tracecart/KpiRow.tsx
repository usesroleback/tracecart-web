import { Kpi } from "@/lib/kpi/types";
import { KpiCard } from "./KpiCard";

export function KpiRow({
  stats,
  loading,
  error,
  currency,
}: {
  stats: { kpis: Kpi[] } | null;
  loading: boolean;
  error: string | null;
  currency: string;
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-[var(--radius-m)] border border-line bg-surface-sunken"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <p className="rounded-[var(--radius-s)] bg-critical-soft px-3 py-2 text-sm text-critical">{error}</p>
    );
  }

  if (!stats || stats.kpis.length === 0) {
    return <p className="text-sm text-ink-muted">Aucune donnée pour le moment.</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {stats.kpis.map((kpi) => (
        <KpiCard key={kpi.key} kpi={kpi} currency={currency} />
      ))}
    </div>
  );
}
