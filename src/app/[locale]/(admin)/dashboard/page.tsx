import { DashboardHome, type Overview } from "./DashboardHome";
import { WorkItem } from "@/components/dashboard/WorkBoard";
import { can, getSessionState } from "@/lib/session";
import { serverGet } from "@/lib/serverApi";

export default async function RootPage() {
  const state = await getSessionState();
  const user = state.status === "ok" ? state.user : null;
  const [work, overview] = await Promise.all([
    serverGet<{ items: WorkItem[] }>("/me/work"),
    user && can(user, "orders.store.read") ? serverGet<Overview>("/store-orders/overview") : null,
  ]);
  return <DashboardHome work={work?.items ?? []} overview={overview} />;
}
