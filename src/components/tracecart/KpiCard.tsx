import { Kpi } from "@/lib/kpi/types";
import { Sparkline } from "@/components/charts/Sparkline";

const ACCENT_BAR: Record<Kpi["status"], string> = {
  success: "before:bg-positive",
  warning: "before:bg-attn",
  error: "before:bg-critical",
  neutral: "before:bg-line-strong",
};

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

export function KpiCard({ kpi, currency }: { kpi: Kpi; currency: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-[var(--radius-m)] border border-line bg-surface-raised p-4 pl-5 before:absolute before:left-0 before:top-0 before:h-full before:w-1 ${ACCENT_BAR[kpi.status]}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs text-ink-muted">{kpi.label}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-ink">
            {formatValue(kpi.value, kpi.format, currency)}
          </p>
          {kpi.deltaPct != null ? (
            <p className={`mt-1 text-xs font-medium tabular-nums ${DELTA_TEXT[kpi.status]}`}>
              {kpi.deltaPct >= 0 ? "▲" : "▼"} {Math.abs(kpi.deltaPct).toLocaleString("fr-FR", { maximumFractionDigits: 1 })}%
            </p>
          ) : (
            <p className="mt-1 text-xs text-ink-muted">Nouveau</p>
          )}
        </div>
        {kpi.sparkline.length > 1 && <Sparkline data={kpi.sparkline} status={kpi.status} />}
      </div>
    </div>
  );
}
