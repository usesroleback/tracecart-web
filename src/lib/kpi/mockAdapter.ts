// Same function signatures as ./adapter.ts, static fixture data. Not wired
// into any page — swap the import in a component during isolated dev
// (`import * as kpi from "@/lib/kpi/mockAdapter"` instead of "./adapter") to
// work on chart/panel UI without a running backend.

import {
  Breakdown,
  BreakdownDimension,
  DashboardStats,
  Granularity,
  Kpi,
  QueueStage,
  RankingItem,
  ReservationStats,
  TrendSeries,
} from "./types";
import { OrderStatus } from "@/lib/types";

function makeKpi(partial: Omit<Kpi, "status"> & { status?: Kpi["status"] }): Kpi {
  return { status: "neutral", ...partial };
}

const MOCK_KPIS: Kpi[] = [
  makeKpi({
    key: "ordersCreated",
    label: "Intentions créées",
    value: 142,
    previousValue: 118,
    deltaPct: 20.3,
    status: "success",
    format: "count",
    sparkline: [12, 15, 9, 18, 20, 14, 22, 19, 25, 21],
  }),
  makeKpi({
    key: "ordersDelivered",
    label: "Livrées",
    value: 96,
    previousValue: 81,
    deltaPct: 18.5,
    status: "success",
    format: "count",
    sparkline: [8, 10, 7, 12, 11, 9, 14, 13, 15, 12],
  }),
  makeKpi({
    key: "revenueProcessed",
    label: "Chiffre d'affaires encaissé",
    value: 5_230_000,
    previousValue: 4_110_000,
    deltaPct: 27.3,
    status: "success",
    format: "currency",
    sparkline: [],
  }),
  makeKpi({
    key: "avgOrderValue",
    label: "Panier moyen",
    value: 36_830,
    previousValue: 34_830,
    deltaPct: 5.7,
    status: "neutral",
    format: "currency",
    sparkline: [],
  }),
  makeKpi({
    key: "avgCycleTimeHours",
    label: "Délai moyen (intention → livraison)",
    value: 27.4,
    previousValue: 31.1,
    deltaPct: -11.9,
    status: "success",
    format: "hours",
    sparkline: [],
  }),
];

const MOCK_STATUS_COUNTS = {
  QUOTING: 4,
  QUOTED: 2,
  QUOTE_SENT: 1,
  RECEIVED_HUB: 3,
  PICKED_UP: 5,
  IN_TRANSIT: 7,
  DELIVERED: 96,
} as const;

export async function fetchDashboardStats(rangeDays = 30): Promise<DashboardStats> {
  return { rangeDays, kpis: MOCK_KPIS, statusCounts: MOCK_STATUS_COUNTS };
}

export async function serverFetchDashboardStats(rangeDays = 30): Promise<DashboardStats | null> {
  return fetchDashboardStats(rangeDays);
}

export async function fetchTrend(granularity: Granularity, _rangeDays: number): Promise<TrendSeries> {
  const points = [5, 7, 4, 9, 8, 6, 11, 10, 13, 9].map((created, i) => ({
    date: `2026-08-${String(11 + i).padStart(2, "0")}`,
    created,
    delivered: Math.round(created * 0.7),
  }));
  return { granularity, points, previousPoints: points.map((p) => ({ ...p, created: Math.round(p.created * 0.8) })) };
}

export async function fetchBreakdown(dimension: BreakdownDimension, _rangeDays: number): Promise<Breakdown> {
  const slices =
    dimension === "provider"
      ? [
          { key: "jumia", label: "Jumia", count: 61 },
          { key: "temu", label: "Temu", count: 40 },
          { key: "unassigned", label: "Non assigné", count: 3 },
        ]
      : [
          { key: "Niamey", label: "Niamey", count: 58 },
          { key: "Ouagadougou", label: "Ouagadougou", count: 22 },
          { key: "Bamako", label: "Bamako", count: 14 },
        ];
  return { dimension, slices };
}

export async function fetchQueueDepth(): Promise<QueueStage[]> {
  return [
    { status: "QUOTING", phase: "abidjan", count: 4, avgAgeHours: 3.2, p90AgeHours: 9.8, isBottleneck: false },
    { status: "QUOTED", phase: "abidjan", count: 2, avgAgeHours: 12.1, p90AgeHours: 20.0, isBottleneck: true },
    { status: "CONFIRMED_HUB", phase: "handoff", count: 1, avgAgeHours: 0.4, p90AgeHours: 0.4, isBottleneck: false },
    { status: "PICKED_UP", phase: "niamey", count: 5, avgAgeHours: 6.7, p90AgeHours: 15.2, isBottleneck: false },
  ];
}

export async function fetchReservationStats(rangeDays = 30): Promise<ReservationStats> {
  return {
    rangeDays,
    kpis: [
      makeKpi({
        key: "reservationsCreated",
        label: "Produits réservés",
        value: 34,
        previousValue: 28,
        deltaPct: 21.4,
        status: "success",
        format: "count",
        sparkline: [],
      }),
      makeKpi({
        key: "reservationsConverted",
        label: "Transformés en commande",
        value: 12,
        previousValue: 9,
        deltaPct: 33.3,
        status: "success",
        format: "count",
        sparkline: [],
      }),
      makeKpi({
        key: "conversionRatePct",
        label: "Taux de conversion",
        value: 35.3,
        previousValue: 32.1,
        deltaPct: 10.0,
        status: "success",
        format: "percent",
        sparkline: [],
      }),
    ],
  };
}

export async function fetchReservationRanking(_rangeDays = 30): Promise<RankingItem[]> {
  return [
    { key: "jumia", label: "Jumia", count: 21, logoUrl: "/images/brand/jumia.svg" },
    { key: "temu", label: "Temu", count: 10, logoUrl: "/images/brand/temu.svg" },
    { key: "unassigned", label: "Non assigné", count: 3 },
  ];
}

export async function fetchStatusCounts(): Promise<Partial<Record<OrderStatus, number>>> {
  return MOCK_STATUS_COUNTS;
}
