import { Inventory } from "@/components/inventory/Inventory";
import { can, getSessionState } from "@/lib/session";

export default async function InventoryPage() {
  const state = await getSessionState();
  const user = state.status === "ok" ? state.user : null;
  return (
    <Inventory
      canAdjust={!!user && can(user, "inventory.adjust")}
      canCount={!!user && can(user, "inventory.count")}
      canReceive={!!user && can(user, "inventory.receive")}
      canDispatch={!!user && (can(user, "inventory.adjust") || can(user, "fulfillment.pick_pack"))}
    />
  );
}
