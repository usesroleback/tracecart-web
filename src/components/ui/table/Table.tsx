import { ReactNode } from "react";

/**
 * Terravia dense ops table (bundle.css .sq-table-wrap/.sq-table, L195-210).
 * Thin styling wrapper around native <table> — not a data-grid abstraction.
 */
export function TableWrap({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`w-full overflow-x-auto rounded-[var(--radius-m)] border border-line bg-surface-raised ${className}`}>
      {children}
    </div>
  );
}

export function Table({ children, dense = false, className = "" }: { children: ReactNode; dense?: boolean; className?: string }) {
  return (
    <table className={`w-full border-separate border-spacing-0 text-sm leading-5 ${className}`} data-dense={dense || undefined}>
      {children}
    </table>
  );
}

export function Th({ children, align = "left", className = "" }: { children: ReactNode; align?: "left" | "right"; className?: string }) {
  return (
    <th
      className={`sticky top-0 whitespace-nowrap border-b border-line bg-surface-sunken px-4 py-2.5 text-[12px] font-[650] uppercase tracking-[0.04em] text-ink-muted ${
        align === "right" ? "text-right" : "text-left"
      } ${className}`}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  mono = false,
  align = "left",
  className = "",
}: {
  children: ReactNode;
  mono?: boolean;
  align?: "left" | "right";
  className?: string;
}) {
  return (
    <td
      className={`border-b border-line px-4 py-3.5 align-middle last:border-0 ${mono ? "font-mono text-[13px]" : ""} ${
        align === "right" ? "text-right tabular-nums" : ""
      } ${className}`}
    >
      {children}
    </td>
  );
}

export function Tr({ children, selected = false, className = "" }: { children: ReactNode; selected?: boolean; className?: string }) {
  return (
    <tr className={`transition-colors duration-[var(--duration-quick)] ease-[var(--ease-out)] hover:bg-surface-sunken ${selected ? "bg-accent-soft" : ""} ${className}`}>
      {children}
    </tr>
  );
}

export function TableSubtext({ children }: { children: ReactNode }) {
  return <span className="mt-0.5 block text-[13px] text-ink-muted">{children}</span>;
}
