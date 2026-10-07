import { OrderStatus, STATUS_LABELS } from "@/lib/types";
import { sideColor, CorridorPhase } from "./CorridorTracker";

const PHASE_BADGE_CLASSES: Record<CorridorPhase, string> = {
  origin: "bg-origin-50 text-origin-700 dark:bg-origin-500/10 dark:text-origin-400",
  handoff: "bg-handoff-50 text-handoff-700 dark:bg-handoff-500/10 dark:text-handoff-400",
  transit: "bg-transit-50 text-transit-700 dark:bg-transit-500/10 dark:text-transit-400",
};

// Delivered gets its own ink-black treatment distinct from the transit green
// — per docs/brand/terravia-brand-guidelines.md's 5-state status vocabulary
// ("delivered = ink with a check"), not just "still in the transit phase."
const DELIVERED_CLASSES = "bg-gray-100 text-ink dark:bg-white/10 dark:text-white";

/** Reused by AttentionTable/QueueDepthPanel so every status-colored element agrees by construction. */
export function statusBadgeClasses(status: OrderStatus): string {
  if (status === "DECLINED" || status === "UNAVAILABLE") {
    return "bg-error-50 text-error-600 dark:bg-error-500/10 dark:text-error-400";
  }
  if (status === "DELIVERED") {
    return DELIVERED_CLASSES;
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
