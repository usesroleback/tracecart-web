import { DashboardHome } from "./DashboardHome";
import { WorkItem } from "@/components/dashboard/WorkBoard";
import { can, getSessionState } from "@/lib/session";
import { serverGet } from "@/lib/serverApi";
import { Order } from "@/lib/types";
import { serverFetchDashboardStats } from "@/lib/kpi/serverAdapter";

export default async function RootPage() {
  const state = await getSessionState();
  const user = state.status === "ok" ? state.user : null;
  // Legacy orders only mean something to hub admins and carriers (ADR-048).
  const readsOrders = !!user && can(user, "orders.read") && user.role !== "STAFF";
  const [work, result, stats] = await Promise.all([
    serverGet<{ items: WorkItem[] }>("/me/work"),
    readsOrders ? serverGet<{ items: Order[] }>("/orders?limit=50") : null,
    user?.role === "SUPER_ADMIN" ? serverFetchDashboardStats(30) : null,
  ]);
  return <DashboardHome work={work?.items ?? []} initialOrders={result?.items ?? []} initialStats={stats} />;
}
