import { OrderStatus } from "@/lib/types";
import { CorridorPhase } from "@/components/tracecart/CorridorTracker";

export type KpiStatus = "success" | "warning" | "error" | "neutral";
export type KpiFormat = "count" | "currency" | "hours" | "percent";
export type Granularity = "day" | "week" | "month";

export interface Kpi {
  key: string;
  label: string;
  value: number;
  previousValue: number;
  deltaPct: number | null; // null when previousValue is 0 (can't compute a meaningful %)
  status: KpiStatus;
  format: KpiFormat;
  sparkline: number[];
}

export interface DashboardStats {
  rangeDays: number;
  kpis: Kpi[];
  statusCounts: Partial<Record<OrderStatus, number>>;
}

export interface TrendPoint {
  date: string;
  created: number;
  delivered: number;
}

export interface TrendSeries {
  granularity: Granularity;
  points: TrendPoint[];
  previousPoints: TrendPoint[];
}

export interface BreakdownSlice {
  key: string;
  label: string;
  count: number;
  logoUrl?: string | null;
}

export type BreakdownDimension = "provider" | "destination";

export interface Breakdown {
  dimension: BreakdownDimension;
  slices: BreakdownSlice[];
}

export interface QueueStage {
  status: OrderStatus;
  phase: CorridorPhase;
  count: number;
  avgAgeHours: number;
  p90AgeHours: number;
  isBottleneck: boolean;
}

export interface ReservationStats {
  rangeDays: number;
  kpis: Kpi[];
}

export interface RankingItem {
  key: string;
  label: string;
  count: number;
  logoUrl?: string | null;
}
