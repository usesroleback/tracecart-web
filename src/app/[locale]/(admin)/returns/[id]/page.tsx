import { ReturnDetail } from "@/components/returns/Returns";
import { can, getSessionState } from "@/lib/session";

export default async function ReturnPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const state = await getSessionState();
  const user = state.status === "ok" ? state.user : null;
  return (
    <ReturnDetail
      id={id}
      canProcess={!!user && can(user, "returns.process")}
      canReceive={!!user && (can(user, "returns.process") || can(user, "inventory.receive"))}
      canRefund={!!user && can(user, "orders.refund")}
      canSeeOrder={!!user && can(user, "orders.store.read")}
    />
  );
}
