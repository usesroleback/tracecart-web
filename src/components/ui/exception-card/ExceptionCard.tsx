import { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { DsAlertIcon, DsBorderIcon } from "@/icons";

type Severity = "critical" | "held";

const SEVERITY_CLASSES: Record<Severity, { card: string; glyph: string }> = {
  // surface-raised, not white: dark mode's critical is a light coral, where white fails 3:1.
  critical: { card: "shadow-[inset_0_3px_0_var(--color-critical)]", glyph: "bg-critical text-surface-raised" },
  held: { card: "shadow-[inset_0_3px_0_var(--color-signal)]", glyph: "bg-signal text-black" },
};

/**
 * Design system ExceptionCard (bundle.css .rb-exc L381-389, bundle.js
 * ExceptionCard): the TraceCartOps "Needs a decision" card. A 3px severity
 * rule across the top and a square glyph (alert = exception, border = held),
 * mono meta, the next action under the body.
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
  const t = useTranslations("common.severity");
  const s = SEVERITY_CLASSES[severity];
  const Glyph = severity === "held" ? DsBorderIcon : DsAlertIcon;
  return (
    <article
      aria-label={`${t(severity)}: ${title}`}
      className={`grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-[var(--radius-m)] border border-line bg-surface-raised p-5 ${s.card}`}
    >
      <span aria-hidden className={`row-span-3 grid h-8 w-8 place-items-center rounded-[var(--radius-xs)] ${s.glyph}`}>
        <Glyph width={18} height={18} />
      </span>
      <h3 className="m-0 text-[17px] font-[680] leading-[22px] text-ink">{title}</h3>
      {meta && <div className="font-mono text-xs text-ink-muted">{meta}</div>}
      {children && <p className="m-0 text-[15px] leading-[22px] text-ink">{children}</p>}
      {actions && <div className="col-start-2 mt-2 flex flex-wrap gap-2">{actions}</div>}
    </article>
  );
}
