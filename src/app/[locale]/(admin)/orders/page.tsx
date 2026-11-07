import { OrdersDashboard } from "./OrdersDashboard";
import { ORDERS_PAGE_LIMIT } from "@/lib/ordersQuery";
import { serverGet } from "@/lib/serverApi";
import { requireAccess } from "@/lib/session";
import { Order } from "@/lib/types";

export default async function OrdersPage() {
  // The list is the hub's: its admin, or hub staff such as a logistics
  // coordinator (ADR-058), never a carrier, who sees orders/[id] only.
  await requireAccess("orders.read", ["SUPER_ADMIN"], "orders.shipment.write");
  const result = await serverGet<{ items: Order[]; total: number }>(`/orders?limit=${ORDERS_PAGE_LIMIT}`);
  return <OrdersDashboard initialOrders={result?.items ?? []} initialTotal={result?.total ?? 0} />;
}
