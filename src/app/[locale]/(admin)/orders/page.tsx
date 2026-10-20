import { OrdersDashboard } from "./OrdersDashboard";
import { ORDERS_PAGE_LIMIT } from "@/lib/ordersQuery";
import { serverGet } from "@/lib/serverApi";
import { Order } from "@/lib/types";

export default async function OrdersPage() {
  const result = await serverGet<{ items: Order[]; total: number }>(`/orders?limit=${ORDERS_PAGE_LIMIT}`);
  return <OrdersDashboard initialOrders={result?.items ?? []} initialTotal={result?.total ?? 0} />;
}
