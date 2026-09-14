import { serverGet } from "@/lib/serverApi";
import { DashboardStats } from "./types";
import { buildKpis, sparklinesFrom, RawSummary, RawTrend } from "./adapter";

// Kept separate from adapter.ts (which is imported by "use client" panels) so
// that next/headers, pulled in transitively via serverGet, never lands in the
// client bundle.
export async function serverFetchDashboardStats(rangeDays = 30): Promise<DashboardStats | null> {
  const [raw, trend] = await Promise.all([
    serverGet<RawSummary>(`/orders/stats/summary?rangeDays=${rangeDays}`),
    serverGet<RawTrend>(`/orders/stats/trend?granularity=day&rangeDays=${rangeDays}`),
  ]);
  if (!raw) return null;
  return { rangeDays, kpis: buildKpis(raw, sparklinesFrom(trend)), statusCounts: raw.statusCounts };
}
