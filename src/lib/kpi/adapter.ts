import { api } from "@/lib/apiClient";
import { OrderStatus } from "@/lib/types";
import {
  Breakdown,
  BreakdownDimension,
  DashboardStats,
  Granularity,
  Kpi,
  KpiFormat,
  QueueStage,
  RankingItem,
  ReservationStats,
  TrendSeries,
} from "./types";
import { isBottleneck, statusFor } from "./thresholds";

// This file is the only place that knows the raw API JSON shape — every
// component downstream only ever sees the typed shapes from ./types.

// label is a French fallback: KpiRow shows labels.kpi.<key> from the messages.
const KPI_META: Record<string, { label: string; format: KpiFormat }> = {
  ordersCreated: { label: "Intentions créées", format: "count" },
  ordersDelivered: { label: "Livrées", format: "count" },
  revenueProcessed: { label: "Chiffre d'affaires encaissé", format: "currency" },
  avgOrderValue: { label: "Panier moyen", format: "currency" },
  avgCycleTimeHours: { label: "Délai moyen (intention → livraison)", format: "hours" },
  reservationsCreated: { label: "Produits réservés", format: "count" },
  reservationsConverted: { label: "Transformés en commande", format: "count" },
  conversionRatePct: { label: "Taux de conversion", format: "percent" },
};

// Render order for the hero row. revenueProcessed/avgOrderValue simply won't
// be present in a partner's raw response, so they're skipped automatically.
const KPI_ORDER = ["ordersCreated", "ordersDelivered", "revenueProcessed", "avgOrderValue", "avgCycleTimeHours"];
const RESERVATION_KPI_ORDER = ["reservationsCreated", "reservationsConverted", "conversionRatePct"];

function computeDeltaPct(value: number, previousValue: number): number | null {
  if (previousValue === 0) return value === 0 ? 0 : null; // no baseline to express as a %
  return ((value - previousValue) / previousValue) * 100;
}

interface RawKpiValue {
  value: number;
  previousValue: number;
}
export interface RawSummary {
  rangeDays: number;
  kpis: Record<string, RawKpiValue>;
  statusCounts: Partial<Record<OrderStatus, number>>;
}
interface RawKpiSet {
  rangeDays: number;
  kpis: Record<string, RawKpiValue>;
}
interface RawRanking {
  slices: { key: string; label: string; count: number; logoUrl?: string | null }[];
}
export interface RawTrend {
  granularity: Granularity;
  series: { date: string; created: number; delivered: number }[];
  previousPeriod: { date: string; created: number; delivered: number }[];
}
interface RawBreakdown {
  dimension: BreakdownDimension;
  slices: { key: string; label: string; count: number; logoUrl?: string | null }[];
}
interface RawQueueDepth {
  stages: { status: OrderStatus; phase: QueueStage["phase"]; count: number; avgAgeHours: number; p90AgeHours: number }[];
}

export function buildKpis(
  raw: RawKpiSet,
  sparklines: Partial<Record<string, number[]>>,
  keyOrder: string[] = KPI_ORDER
): Kpi[] {
  return keyOrder.filter((key) => key in raw.kpis).map((key) => {
    const { value, previousValue } = raw.kpis[key];
    const meta = KPI_META[key];
    const deltaPct = computeDeltaPct(value, previousValue);
    return {
      key,
      label: meta.label,
      value,
      previousValue,
      deltaPct,
      status: statusFor(key, deltaPct),
      format: meta.format,
      sparkline: sparklines[key] ?? [],
    };
  });
}

// Only ordersCreated/ordersDelivered have a real trailing time series today
// (from /stats/trend) — revenue/avgOrderValue/avgCycleTimeHours get an empty
// sparkline rather than a fabricated one; components render nothing for those
// instead of a fake trend line.
export function sparklinesFrom(trend: RawTrend | null): Partial<Record<string, number[]>> {
  if (!trend) return {};
  return {
    ordersCreated: trend.series.map((p) => p.created),
    ordersDelivered: trend.series.map((p) => p.delivered),
  };
}

export async function fetchDashboardStats(rangeDays = 30): Promise<DashboardStats> {
  const raw = await api.get<RawSummary>(`/orders/stats/summary?rangeDays=${rangeDays}`);
  const trend = await api
    .get<RawTrend>(`/orders/stats/trend?granularity=day&rangeDays=${rangeDays}`)
    .catch(() => null);
  return { rangeDays, kpis: buildKpis(raw, sparklinesFrom(trend)), statusCounts: raw.statusCounts };
}

export async function fetchTrend(granularity: Granularity, rangeDays: number): Promise<TrendSeries> {
  const raw = await api.get<RawTrend>(`/orders/stats/trend?granularity=${granularity}&rangeDays=${rangeDays}`);
  return { granularity: raw.granularity, points: raw.series, previousPoints: raw.previousPeriod };
}

export async function fetchBreakdown(dimension: BreakdownDimension, rangeDays: number): Promise<Breakdown> {
  const raw = await api.get<RawBreakdown>(`/orders/stats/breakdown?dimension=${dimension}&rangeDays=${rangeDays}`);
  return { dimension: raw.dimension, slices: raw.slices };
}

export async function fetchQueueDepth(): Promise<QueueStage[]> {
  const raw = await api.get<RawQueueDepth>("/orders/stats/queue-depth");
  return raw.stages.map((s) => ({ ...s, isBottleneck: isBottleneck(s.status, s.p90AgeHours) }));
}

export async function fetchReservationStats(rangeDays = 30): Promise<ReservationStats> {
  const raw = await api.get<RawKpiSet>(`/reservations/stats/summary?rangeDays=${rangeDays}`);
  return { rangeDays, kpis: buildKpis(raw, {}, RESERVATION_KPI_ORDER) };
}

export async function fetchReservationRanking(rangeDays = 30): Promise<RankingItem[]> {
  const raw = await api.get<RawRanking>(`/reservations/stats/ranking?rangeDays=${rangeDays}`);
  return raw.slices;
}

// statusCounts is an all-time distribution (not rangeDays-filtered — see
// orders.stats.service.ts's getStatsSummary), so any rangeDays value works
// here; kept separate from fetchDashboardStats to avoid pages that only need
// the per-status tiles also paying for the trend-series round trip.
export async function fetchStatusCounts(): Promise<Partial<Record<OrderStatus, number>>> {
  const raw = await api.get<RawSummary>("/orders/stats/summary?rangeDays=30");
  return raw.statusCounts;
}
