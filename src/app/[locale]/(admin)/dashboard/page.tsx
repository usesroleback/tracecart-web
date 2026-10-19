import { DashboardHome } from "./DashboardHome";
import { serverGet } from "@/lib/serverApi";
import { Order } from "@/lib/types";
import { serverFetchDashboardStats } from "@/lib/kpi/serverAdapter";

export default async function RootPage() {
  const [result, stats] = await Promise.all([
    serverGet<{ items: Order[] }>("/orders?limit=50"),
    serverFetchDashboardStats(30),
  ]);
  return <DashboardHome initialOrders={result?.items ?? []} initialStats={stats} />;
}
