import { useTranslations } from "next-intl";
import { Kpi } from "@/lib/kpi/types";
import { Format, useFormat } from "@/lib/format";
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
function formatValue(f: Format, value: number, format: Kpi["format"], currency: string): string {
  if (format === "currency") return f.money(value, currency);
  if (format === "hours") return f.hours(value);
  if (format === "percent") return f.percent(value);
  return f.number(value);
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
  const t = useTranslations("dashboard");
  const tk = useTranslations("labels.kpi");
  const f = useFormat();
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
    return <p className="text-sm text-ink-muted">{t("panels.noData")}</p>;
  }

  return (
    <KpiStrip
      items={stats.kpis.map((kpi) => ({
        key: kpi.key,
        value: formatValue(f, kpi.value, kpi.format, currency),
        label: tk.has(kpi.key) ? tk(kpi.key) : kpi.label,
        note:
          kpi.deltaPct != null ? (
            <span className={`tabular-nums ${DELTA_TEXT[kpi.status]}`}>
              {kpi.deltaPct >= 0 ? "▲" : "▼"} {f.percent(Math.abs(kpi.deltaPct))}
            </span>
          ) : (
            <span className="font-normal text-ink-muted">{t("kpi.new")}</span>
          ),
        aside: kpi.sparkline.length > 1 ? <Sparkline data={kpi.sparkline} status={kpi.status} /> : undefined,
      }))}
    />
  );
}
