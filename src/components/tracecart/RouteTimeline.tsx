import { CSSProperties } from "react";
import { useTranslations } from "next-intl";
import { Format } from "@/lib/format";
import { DsCheckIcon, DsCloseIcon } from "@/icons";
import { Order, OrderHistoryEntry, OrderStatus } from "@/lib/types";

export type RouteStepState = "done" | "now" | "held" | "exception" | "planned";

export type RouteStep = {
  label: string;
  place?: string;
  when?: string;
  state: RouteStepState;
  /** For the "now" leg: how much of it is behind us, 0-100. */
  progress?: number;
};

/**
 * Design system RouteTimeline (bundle.js RouteTimeline, styles in
 * globals.css .rb-route): an ordered list of legs, aria-current on the
 * live one, the state spelled out for screen readers.
 */
export function RouteTimeline({
  steps,
  label,
  vertical = false,
  animate = false,
  className = "",
}: {
  steps: RouteStep[];
  label?: string;
  vertical?: boolean;
  animate?: boolean;
  className?: string;
}) {
  const t = useTranslations("orders.route");
  return (
    <ol
      aria-label={label ?? t("label")}
      className={`rb-route ${vertical ? "rb-route--vertical" : ""} ${animate ? "rb-route--draw" : ""} ${className}`}
      style={{ "--_n": steps.length } as CSSProperties}
    >
      {steps.map((s) => (
        <li
          key={s.label}
          className="rb-route__step"
          data-s={s.state === "planned" ? "" : s.state}
          aria-current={s.state === "now" || s.state === "held" ? "step" : undefined}
          style={s.state === "now" && s.progress != null ? ({ "--_p": `${s.progress}%` } as CSSProperties) : undefined}
        >
          <span className="rb-route__node" aria-hidden>
            {s.state === "done" && <DsCheckIcon width={12} height={12} strokeWidth={3} />}
            {s.state === "exception" && <DsCloseIcon width={12} height={12} strokeWidth={3} />}
          </span>
          <span className="rb-route__label">
            {s.label}
            <span className="sr-only"> — {t(`state.${s.state}`)}</span>
          </span>
          {s.place && <span className="rb-route__place">{s.place}</span>}
          {s.when && <span className="rb-route__when">{s.when}</span>}
        </li>
      ))}
    </ol>
  );
}

// The lifecycle's statuses grouped into the legs a customer would recognise.
// No customs/"clear" leg: orders don't record border checkpoints yet.
const LEGS: { label: "order" | "hub" | "moving" | "delivery"; statuses: OrderStatus[] }[] = [
  { label: "order", statuses: ["INTENT_SUBMITTED", "QUOTING", "QUOTED", "QUOTE_SENT", "PAID", "PURCHASED"] },
  { label: "hub", statuses: ["RECEIVED_HUB", "CONFIRMED_HUB"] },
  { label: "moving", statuses: ["PICKED_UP", "IN_TRANSIT"] },
  { label: "delivery", statuses: ["DELIVERED"] },
];

function legIndexOf(status: OrderStatus): number {
  return LEGS.findIndex((leg) => leg.statuses.includes(status));
}

/**
 * Route steps for an order. Each leg is dated from the first time the order
 * entered it (status history). A declined/unavailable order marks the leg it
 * was in when it stopped as the exception. `t` is the "orders" translator.
 */
export function orderRouteSteps(
  order: Order,
  history: OrderHistoryEntry[],
  t: (key: string) => string,
  f: Format,
): RouteStep[] {
  const stopped = order.status === "DECLINED" || order.status === "UNAVAILABLE";
  let current = order.status;
  if (stopped) {
    const exit = [...history].reverse().find((h) => h.toStatus === order.status);
    current = exit?.fromStatus && legIndexOf(exit.fromStatus) >= 0 ? exit.fromStatus : "INTENT_SUBMITTED";
  }
  const currentLeg = legIndexOf(current);
  const delivered = order.status === "DELIVERED";

  const places = [
    order.intakeType === "CUSTOMER_OWNED" ? t("source.customerOwned") : order.provider?.name ?? t("source.unknownStore"),
    order.hub.city,
    `${order.hub.city} → ${order.destinationCity}`,
    order.destinationCity,
  ];

  return LEGS.map((leg, i) => {
    const entered = history.find((h) => leg.statuses.includes(h.toStatus));
    let state: RouteStepState = "planned";
    let progress: number | undefined;
    if (i < currentLeg || (delivered && i === currentLeg)) state = "done";
    else if (i === currentLeg) {
      if (stopped) state = "exception";
      else if (current === "CONFIRMED_HUB") state = "held";
      else {
        state = "now";
        progress = Math.round(((leg.statuses.indexOf(current) + 1) / (leg.statuses.length + 1)) * 100);
      }
    }
    return {
      label: t(`route.legs.${leg.label}`),
      place: places[i],
      when: entered && state !== "planned" ? f.shortDate(entered.createdAt) : undefined,
      state,
      progress,
    };
  });
}
