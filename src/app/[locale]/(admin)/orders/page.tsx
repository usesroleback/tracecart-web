import { OrdersDashboard } from "./OrdersDashboard";
import { ORDERS_PAGE_LIMIT } from "@/lib/ordersQuery";
import { serverGet } from "@/lib/serverApi";
import { requireRole } from "@/lib/session";
import { Order } from "@/lib/types";

export default async function OrdersPage() {
  // The list is the admin console; orders/[id] is shared with partners, so the
  // role check lives here rather than in a layout over the whole folder.
  await requireRole("SUPER_ADMIN");
  const result = await serverGet<{ items: Order[]; total: number }>(`/orders?limit=${ORDERS_PAGE_LIMIT}`);
  return <OrdersDashboard initialOrders={result?.items ?? []} initialTotal={result?.total ?? 0} />;
}
