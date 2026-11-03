import { StoreOrderDetail } from "@/components/store-orders/StoreOrders";
import { can, getSessionState } from "@/lib/session";

export default async function StoreOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const state = await getSessionState();
  const user = state.status === "ok" ? state.user : null;
  return <StoreOrderDetail id={id} canCancel={!!user && can(user, "orders.cancel")} canConfirm={!!user && can(user, "payments.manual.confirm")} canRefund={!!user && can(user, "orders.refund")} />;
}
