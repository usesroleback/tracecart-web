import { Kpi } from "@/lib/kpi/types";
import { Sparkline } from "@/components/charts/Sparkline";
import { KpiStrip } from "@/components/ui/kpi-strip/KpiStrip";

const DELTA_TEXT: Record<Kpi["status"], string> = {
  success: "text-positive",
  warning: "text-attn",
  error: "text-critical",
  neutral: "text-ink-muted",
};

// Hub-scoped KPIs (orders.stats.service.ts §getAdminHubId) are always in the
// current admin's hub currency — never hardcode a currency symbol, since
// TraceCart hubs span many currencies, not just FCFA (docs/brand/tracecart-brand-guidelines.md:
// "never as an African logistics startup").
function formatValue(value: number, format: Kpi["format"], currency: string): string {
  if (format === "currency") return `${value.toLocaleString("fr-FR")} ${currency}`.trim();
  if (format === "hours") return `${value.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} h`;
  if (format === "percent") return `${value.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}%`;
  return value.toLocaleString("fr-FR");
}

/** KPIs on the TraceCartOps ruled strip (KpiStrip): numeral, label, trend, sparkline. */
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
      <div className="grid grid-cols-2 gap-px border-t-[length:var(--border-strong)] border-t-ink lg:grid-cols-5" aria-busy="true">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="my-4 mr-4 h-16 animate-pulse rounded-[var(--radius-s)] bg-surface-sunken" />
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
    <KpiStrip
      items={stats.kpis.map((kpi) => ({
        key: kpi.key,
        value: formatValue(kpi.value, kpi.format, currency),
        label: kpi.label,
        note:
          kpi.deltaPct != null ? (
            <span className={`tabular-nums ${DELTA_TEXT[kpi.status]}`}>
              {kpi.deltaPct >= 0 ? "▲" : "▼"} {Math.abs(kpi.deltaPct).toLocaleString("fr-FR", { maximumFractionDigits: 1 })}%
            </span>
          ) : (
            <span className="font-normal text-ink-muted">Nouveau</span>
          ),
        aside: kpi.sparkline.length > 1 ? <Sparkline data={kpi.sparkline} status={kpi.status} /> : undefined,
      }))}
    />
  );
}
