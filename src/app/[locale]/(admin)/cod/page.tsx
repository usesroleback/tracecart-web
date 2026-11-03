import { CodCash } from "@/components/shipments/Cod";
import { can, getSessionState } from "@/lib/session";

export default async function CodPage() {
  const state = await getSessionState();
  const user = state.status === "ok" ? state.user : null;
  return <CodCash canDeclare={!!user && can(user, "shipments.cod.collect")} canDecide={!!user && can(user, "payments.reconcile")} />;
}
