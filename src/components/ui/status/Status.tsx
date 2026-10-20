import { useTranslations } from "next-intl";
import { OrderStatus, ReservationStatus, SourcingRequestStatus } from "@/lib/types";
import { sideColor } from "@/components/tracecart/CorridorTracker";
import { DsCheckIcon, DsCloseIcon } from "@/icons";

export type StatusState = "planned" | "moving" | "held" | "exception" | "done";

const GLYPH_CLASSES: Record<StatusState, string> = {
  planned: "rounded-full shadow-[inset_0_0_0_1.5px_var(--color-line-strong)]",
  moving: "rounded-full bg-accent",
  held: "rounded-full bg-signal text-black",
  exception: "rounded-[var(--radius-xs)] bg-critical text-surface-raised",
  done: "rounded-full bg-ink text-ink-inverse",
};

/**
 * Design system .rb-status (bundle.css L180-191): status is always shape + word,
 * never color alone. planned = ring, moving = pulsing dot, held = minus,
 * exception = critical square x, done = ink check.
 */
export function Status({ state, label, meta }: { state: StatusState; label: string; meta?: string }) {
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap text-sm font-[580] text-ink">
      <span className={`relative grid h-[18px] w-[18px] flex-none place-items-center ${GLYPH_CLASSES[state]}`}>
        {state === "moving" && (
          <>
            <span className="h-1.5 w-1.5 rounded-full bg-black" />
            <span className="absolute -inset-[3px] animate-[rb-pulse_1800ms_var(--ease-out)_infinite] rounded-full border-[1.5px] border-accent opacity-0" />
          </>
        )}
        {state === "held" && <span className="h-[2px] w-2.5 bg-black" />}
        {state === "exception" && <DsCloseIcon width={12} height={12} strokeWidth={2.5} aria-hidden />}
        {state === "done" && <DsCheckIcon width={12} height={12} strokeWidth={2.5} aria-hidden />}
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
  const t = useTranslations("labels.status");
  return <Status state={orderStatusState(status)} label={t(status)} meta={meta} />;
}

const SOURCING_REQUEST_STATES: Record<SourcingRequestStatus, StatusState> = {
  OPEN: "planned",
  MATCHED: "held",
  CONVERTED: "done",
  CLOSED: "exception",
};

export function SourcingRequestStatusTag({ status, meta }: { status: SourcingRequestStatus; meta?: string }) {
  const t = useTranslations("labels.sourcingStatus");
  return <Status state={SOURCING_REQUEST_STATES[status]} label={t(status)} meta={meta} />;
}

const RESERVATION_STATES: Record<ReservationStatus, StatusState> = {
  RESERVED: "planned",
  CONVERTED: "done",
};

export function ReservationStatusTag({ status, meta }: { status: ReservationStatus; meta?: string }) {
  const t = useTranslations("labels.reservationStatus");
  return <Status state={RESERVATION_STATES[status]} label={t(status)} meta={meta} />;
}
