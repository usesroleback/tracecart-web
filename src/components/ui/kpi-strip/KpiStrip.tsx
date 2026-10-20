import { ReactNode } from "react";

export type KpiStripItem = {
  key: string;
  value: ReactNode;
  label: string;
  /** One short line under the label, e.g. "2 need a decision". */
  note?: ReactNode;
  /** Exceptions: the numeral and note turn critical. */
  critical?: boolean;
  /** Extra content beside the numeral (e.g. a sparkline). */
  aside?: ReactNode;
};

/**
 * TraceCartOps KPI strip (project/components/TraceCartOps/preview.html .kpis):
 * a 2px ink rule on top, 1px hairlines between cells, large light numerals —
 * ruled, not boxed. Stacks into a 2-column grid below lg.
 */
export function KpiStrip({ items, className = "" }: { items: KpiStripItem[]; className?: string }) {
  return (
    <div
      className={`grid grid-cols-2 border-t-[length:var(--border-strong)] border-t-ink border-b-line lg:border-b lg:grid-cols-[repeat(var(--n),minmax(0,1fr))] ${className}`}
      style={{ ["--n" as string]: items.length }}
    >
      {items.map((item, i) => (
        <div
          key={item.key}
          className={`flex items-start justify-between gap-2 border-line px-0 pt-4 pb-[18px] pr-4 max-lg:border-b ${
            i > 0 ? "lg:border-l lg:pl-4" : ""
          } max-lg:even:pl-4 max-lg:even:border-l`}
        >
          <div className="min-w-0">
            <div className={`rb-numeral text-[32px] lg:text-[44px] ${item.critical ? "text-critical" : "text-ink"}`}>{item.value}</div>
            <div className="mt-1.5 text-[13px] text-ink-muted">{item.label}</div>
            {item.note && (
              <div className={`mt-0.5 text-xs font-semibold ${item.critical ? "text-critical" : "text-ink"}`}>{item.note}</div>
            )}
          </div>
          {item.aside}
        </div>
      ))}
    </div>
  );
}
