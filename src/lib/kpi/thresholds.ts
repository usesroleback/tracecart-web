import { OrderStatus } from "@/lib/types";
import { KpiStatus } from "./types";

interface ThresholdRule {
  /** "up" = a higher value is good (orders, revenue); "down" = a lower value is good (cycle time). */
  direction: "up" | "down";
  warnPct: number;
  errorPct: number;
}

// Percent-change bands, in the "bad" direction, before a KPI flips to warning/error.
// Not empirically tuned yet — reasonable starting guesses, meant to be adjusted
// once real usage data exists. Any KPI key not listed here renders "neutral".
const RULES: Record<string, ThresholdRule> = {
  ordersCreated: { direction: "up", warnPct: 10, errorPct: 25 },
  ordersDelivered: { direction: "up", warnPct: 10, errorPct: 25 },
  revenueProcessed: { direction: "up", warnPct: 10, errorPct: 25 },
  avgOrderValue: { direction: "up", warnPct: 15, errorPct: 30 },
  avgCycleTimeHours: { direction: "down", warnPct: 15, errorPct: 30 },
  reservationsCreated: { direction: "up", warnPct: 15, errorPct: 30 },
  reservationsConverted: { direction: "up", warnPct: 15, errorPct: 30 },
  conversionRatePct: { direction: "up", warnPct: 10, errorPct: 25 },
};

export function statusFor(key: string, deltaPct: number | null): KpiStatus {
  const rule = RULES[key];
  if (!rule || deltaPct == null) return "neutral";
  const badPct = rule.direction === "up" ? -deltaPct : deltaPct;
  if (badPct >= rule.errorPct) return "error";
  if (badPct >= rule.warnPct) return "warning";
  return "success";
}

// Age (p90, in hours) past which a pipeline stage is flagged as a bottleneck.
// Stages not listed fall back to DEFAULT_STAGE_AGE_THRESHOLD_HOURS. Guesses,
// same caveat as above — CONFIRMED_HUB is intentionally tight since it's meant
// to be a near-instant handoff, not a stage anything should sit in.
const STAGE_AGE_THRESHOLD_HOURS: Partial<Record<OrderStatus, number>> = {
  QUOTING: 24,
  QUOTED: 12,
  QUOTE_SENT: 72,
  CONFIRMED_HUB: 6,
};
const DEFAULT_STAGE_AGE_THRESHOLD_HOURS = 48;

export function isBottleneck(status: OrderStatus, p90AgeHours: number): boolean {
  const threshold = STAGE_AGE_THRESHOLD_HOURS[status] ?? DEFAULT_STAGE_AGE_THRESHOLD_HOURS;
  return p90AgeHours > threshold;
}

// Target for the reservations conversion-rate bullet chart. No product-defined
// goal exists yet, so this is a documented starting assumption (not derived
// from data) — adjust once there's a real target to compare against.
export const RESERVATION_CONVERSION_TARGET_PCT = 40;
