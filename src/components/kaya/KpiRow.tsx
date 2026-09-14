import { Kpi } from "@/lib/kpi/types";
import { KpiCard } from "./KpiCard";

export function KpiRow({
  stats,
  loading,
  error,
}: {
  stats: { kpis: Kpi[] } | null;
  loading: boolean;
  error: string | null;
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-2xl border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-white/5"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <p className="rounded-lg bg-error-50 px-3 py-2 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
        {error}
      </p>
    );
  }

  if (!stats || stats.kpis.length === 0) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">Aucune donnée pour le moment.</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {stats.kpis.map((kpi) => (
        <KpiCard key={kpi.key} kpi={kpi} />
      ))}
    </div>
  );
}
