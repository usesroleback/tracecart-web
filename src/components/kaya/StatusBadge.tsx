import { OrderStatus, STATUS_LABELS } from "@/lib/types";
import { sideColor, CorridorPhase } from "./CorridorTracker";

const PHASE_BADGE_CLASSES: Record<CorridorPhase, string> = {
  abidjan: "bg-abidjan-50 text-abidjan-700 dark:bg-abidjan-500/10 dark:text-abidjan-400",
  handoff: "bg-handoff-50 text-handoff-600 dark:bg-handoff-500/10 dark:text-handoff-400",
  niamey: "bg-niamey-50 text-niamey-600 dark:bg-niamey-500/10 dark:text-niamey-400",
};

/** Reused by AttentionTable/QueueDepthPanel so every status-colored element agrees by construction. */
export function statusBadgeClasses(status: OrderStatus): string {
  if (status === "DECLINED" || status === "UNAVAILABLE") {
    return "bg-error-50 text-error-600 dark:bg-error-500/10 dark:text-error-400";
  }
  return PHASE_BADGE_CLASSES[sideColor(status)];
}

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeClasses(status)}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}
