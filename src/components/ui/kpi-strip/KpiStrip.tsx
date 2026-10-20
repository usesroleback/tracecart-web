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

// Amounts like "3 788 680 XOF" step down a size so they stay on one line.
const long = (v: ReactNode) => typeof v === "string" && v.length > 9;

/**
 * TraceCartOps KPI strip (project/components/TraceCartOps/preview.html .kpis):
 * a 2px ink rule on top, 1px hairlines between cells, large light numerals —
 * ruled, not boxed. Stacks into a 2-column grid until the console's content
 * is 860px wide (the main container), whatever the window width.
 */
export function KpiStrip({ items, className = "" }: { items: KpiStripItem[]; className?: string }) {
  return (
    <div
      className={`grid grid-cols-2 border-t-[length:var(--border-strong)] border-t-ink border-b-line @min-[860px]/main:border-b @min-[860px]/main:grid-cols-[repeat(var(--n),minmax(0,1fr))] ${className}`}
      style={{ ["--n" as string]: items.length }}
    >
      {items.map((item, i) => (
        <div
          key={item.key}
          className={`flex items-start justify-between gap-2 border-line px-0 pt-4 pb-[18px] pr-4 @max-[860px]/main:border-b ${
            i > 0 ? "@min-[860px]/main:border-l @min-[860px]/main:pl-4" : ""
          } @max-[860px]/main:even:pl-4 @max-[860px]/main:even:border-l`}
        >
          <div className="min-w-0">
            <div
              className={`rb-numeral ${long(item.value) ? "whitespace-nowrap text-[26px] @min-[1100px]/main:text-[32px]" : "text-[32px] @min-[860px]/main:text-[44px]"} ${
                item.critical ? "text-critical" : "text-ink"
              }`}
            >
              {typeof item.value === "string" ? item.value.replace(/\u202f/g, "\u00a0") : item.value}
            </div>
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
