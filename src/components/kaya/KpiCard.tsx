import { Kpi } from "@/lib/kpi/types";
import { Sparkline } from "@/components/charts/Sparkline";

const ACCENT_BAR: Record<Kpi["status"], string> = {
  success: "before:bg-success-500",
  warning: "before:bg-warning-500",
  error: "before:bg-error-500",
  neutral: "before:bg-gray-300 dark:before:bg-gray-700",
};

const DELTA_TEXT: Record<Kpi["status"], string> = {
  success: "text-success-600 dark:text-success-400",
  warning: "text-warning-600 dark:text-warning-400",
  error: "text-error-600 dark:text-error-400",
  neutral: "text-gray-400",
};

function formatValue(value: number, format: Kpi["format"]): string {
  if (format === "currency") return `${value.toLocaleString("fr-FR")} FCFA`;
  if (format === "hours") return `${value.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} h`;
  if (format === "percent") return `${value.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}%`;
  return value.toLocaleString("fr-FR");
}

export function KpiCard({ kpi }: { kpi: Kpi }) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 pl-5 shadow-theme-xs before:absolute before:left-0 before:top-0 before:h-full before:w-1 dark:border-gray-800 dark:bg-white/[0.03] ${ACCENT_BAR[kpi.status]}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">{kpi.label}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-gray-800 dark:text-white/90">
            {formatValue(kpi.value, kpi.format)}
          </p>
          {kpi.deltaPct != null ? (
            <p className={`mt-1 text-xs font-medium tabular-nums ${DELTA_TEXT[kpi.status]}`}>
              {kpi.deltaPct >= 0 ? "▲" : "▼"} {Math.abs(kpi.deltaPct).toLocaleString("fr-FR", { maximumFractionDigits: 1 })}%
            </p>
          ) : (
            <p className="mt-1 text-xs text-gray-400">Nouveau</p>
          )}
        </div>
        {kpi.sparkline.length > 1 && <Sparkline data={kpi.sparkline} status={kpi.status} />}
      </div>
    </div>
  );
}
