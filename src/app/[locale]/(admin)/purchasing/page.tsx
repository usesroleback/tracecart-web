import { Purchasing } from "@/components/purchasing/Purchasing";
import { can, getSessionState } from "@/lib/session";

export default async function PurchasingPage() {
  const state = await getSessionState();
  const user = state.status === "ok" ? state.user : null;
  return (
    <Purchasing
      canBuy={!!user && can(user, "purchasing.po.write")}
      seesCosts={!!user && can(user, "purchasing.po.read")}
      canLogistics={!!user && can(user, "logistics.consolidation.write")}
      canCustoms={!!user && can(user, "customs.file.write")}
      canReceive={!!user && can(user, "inventory.receive")}
    />
  );
}
