import { ShipmentDetail } from "@/components/shipments/Shipments";
import { can, getSessionState } from "@/lib/session";

export default async function ShipmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const state = await getSessionState();
  const user = state.status === "ok" ? state.user : null;
  return (
    <ShipmentDetail
      id={id}
      canPack={!!user && can(user, "fulfillment.pick_pack")}
      canRoute={!!user && can(user, "logistics.routing.assign")}
      canRecord={!!user && can(user, "shipments.event.record")}
      canProve={!!user && can(user, "shipments.proof.upload")}
      canReissue={!!user && can(user, "logistics.exception.write")}
      canResolve={!!user && can(user, "logistics.exception.write")}
      canSeeOrder={!!user && can(user, "orders.store.read")}
    />
  );
}
