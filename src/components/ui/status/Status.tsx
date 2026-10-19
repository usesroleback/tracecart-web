import { OrderStatus, ReservationStatus, SourcingRequestStatus, STATUS_LABELS, STATUS_SEQUENCE } from "@/lib/types";
import { sideColor } from "@/components/tracecart/CorridorTracker";

export type StatusState = "planned" | "moving" | "held" | "exception" | "done";

const GLYPH_CLASSES: Record<StatusState, string> = {
  planned: "shadow-[inset_0_0_0_1.5px_var(--color-line-strong)]",
  moving: "bg-accent",
  held: "bg-signal text-black",
  exception: "rounded-[var(--radius-xs)] bg-critical text-white",
  done: "bg-ink text-ink-inverse",
};

/**
 * Terravia .sq-status (bundle.css L180-191): status is always shape + word,
 * never color alone. planned = ring, moving = pulsing dot, held = minus,
 * exception = critical square x, done = ink check.
 */
export function Status({ state, label, meta }: { state: StatusState; label: string; meta?: string }) {
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap text-sm font-[580] text-ink">
      <span className={`relative grid h-[18px] w-[18px] flex-none place-items-center rounded-full ${GLYPH_CLASSES[state]}`}>
        {state === "moving" && (
          <>
            <span className="h-1.5 w-1.5 rounded-full bg-black" />
            <span className="absolute -inset-[3px] animate-[sq-pulse_1800ms_var(--ease-out)_infinite] rounded-full border-[1.5px] border-accent opacity-0" />
          </>
        )}
        {state === "held" && <span className="h-[2px] w-2.5 bg-black" />}
        {state === "exception" && <span className="text-[10px] leading-none">×</span>}
        {state === "done" && <span className="text-[10px] leading-none">✓</span>}
      </span>
      {label}
      {meta && <span className="font-normal text-ink-muted">{meta}</span>}
    </span>
  );
}

function orderStatusState(status: OrderStatus): StatusState {
  if (status === "DECLINED" || status === "UNAVAILABLE") return "exception";
  if (status === "DELIVERED") return "done";
  const phase = sideColor(status);
  if (phase === "handoff") return "held";
  if (phase === "transit") return "moving";
  return "planned";
}

export function OrderStatusTag({ status, meta }: { status: OrderStatus; meta?: string }) {
  return <Status state={orderStatusState(status)} label={STATUS_LABELS[status]} meta={meta} />;
}

const SOURCING_REQUEST_LABELS: Record<SourcingRequestStatus, string> = {
  OPEN: "Ouverte",
  MATCHED: "Candidat choisi",
  CONVERTED: "Transformée",
  CLOSED: "Clôturée",
};

const SOURCING_REQUEST_STATES: Record<SourcingRequestStatus, StatusState> = {
  OPEN: "planned",
  MATCHED: "held",
  CONVERTED: "done",
  CLOSED: "exception",
};

export function SourcingRequestStatusTag({ status, meta }: { status: SourcingRequestStatus; meta?: string }) {
  return <Status state={SOURCING_REQUEST_STATES[status]} label={SOURCING_REQUEST_LABELS[status]} meta={meta} />;
}

const RESERVATION_LABELS: Record<ReservationStatus, string> = {
  RESERVED: "Réservé",
  CONVERTED: "Transformé",
};

const RESERVATION_STATES: Record<ReservationStatus, StatusState> = {
  RESERVED: "planned",
  CONVERTED: "done",
};

export function ReservationStatusTag({ status, meta }: { status: ReservationStatus; meta?: string }) {
  return <Status state={RESERVATION_STATES[status]} label={RESERVATION_LABELS[status]} meta={meta} />;
}
