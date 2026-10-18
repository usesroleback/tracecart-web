import { ReactNode } from "react";

type Severity = "critical" | "held";

const SEVERITY_BAR: Record<Severity, string> = {
  critical: "before:bg-critical",
  held: "before:bg-signal",
};

/**
 * TerraviaOps "Needs a decision" card (project/components/TerraviaOps/preview.html):
 * title/meta/children/actions, severity-tinted left accent.
 */
export function ExceptionCard({
  title,
  meta,
  severity = "critical",
  actions,
  children,
}: {
  title: string;
  meta?: string;
  severity?: Severity;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-[var(--radius-m)] border border-line bg-surface-raised p-4 pl-5 before:absolute before:left-0 before:top-0 before:h-full before:w-1 ${SEVERITY_BAR[severity]}`}
    >
      <p className="sq-title text-[16px]">{title}</p>
      {meta && <p className="mt-0.5 text-xs text-ink-muted">{meta}</p>}
      {children && <p className="mt-2 text-sm text-ink-muted">{children}</p>}
      {actions && <div className="mt-3 flex gap-2">{actions}</div>}
    </div>
  );
}
