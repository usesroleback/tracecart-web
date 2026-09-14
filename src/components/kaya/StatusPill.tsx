export type PillTone = "success" | "warning" | "error" | "neutral";

const TONE_CLASSES: Record<PillTone, string> = {
  success: "bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400",
  warning: "bg-warning-50 text-warning-600 dark:bg-warning-500/10 dark:text-warning-400",
  error: "bg-error-50 text-error-600 dark:bg-error-500/10 dark:text-error-400",
  neutral: "bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-400",
};

/** Generalizes the ad-hoc active/inactive and status pill markup previously duplicated across pages. */
export function StatusPill({ tone, label }: { tone: PillTone; label: string }) {
  return <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${TONE_CLASSES[tone]}`}>{label}</span>;
}
