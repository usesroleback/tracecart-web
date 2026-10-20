import { ReactNode } from "react";
import { DsAlertIcon, DsCheckIcon, DsInfoIcon } from "@/icons";

type Tone = "neutral" | "positive" | "warning" | "critical" | "info";

const TONE: Record<Tone, { bg: string; icon: string }> = {
  neutral: { bg: "bg-surface-sunken", icon: "text-ink-muted" },
  positive: { bg: "bg-positive-soft", icon: "text-positive" },
  warning: { bg: "bg-attn-soft", icon: "text-attn" },
  critical: { bg: "bg-critical-soft", icon: "text-critical" },
  info: { bg: "bg-ds-info-soft", icon: "text-ds-info" },
};

/**
 * Design system Alert (bundle.css .rb-alert L236-244): tinted ground, icon in
 * the tone's colour, text stays ink. Says what happened and what to do next.
 * Critical alerts are role="alert"; the rest are role="status".
 */
export function Alert({
  tone = "neutral",
  title,
  children,
  action,
  className = "",
}: {
  tone?: Tone;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  const t = TONE[tone];
  const Icon = tone === "positive" ? DsCheckIcon : tone === "info" || tone === "neutral" ? DsInfoIcon : DsAlertIcon;
  return (
    <div
      role={tone === "critical" ? "alert" : "status"}
      className={`flex items-start gap-3 rounded-[var(--radius-m)] p-4 text-[15px] leading-[22px] text-ink ${t.bg} ${className}`}
    >
      <Icon width={20} height={20} className={`mt-px flex-none ${t.icon}`} aria-hidden />
      <div className="flex-1">
        <strong className="font-[650]">{title}</strong>
        {children && <p className="mt-0.5 text-ink">{children}</p>}
      </div>
      {action && <div className="flex-none">{action}</div>}
    </div>
  );
}
