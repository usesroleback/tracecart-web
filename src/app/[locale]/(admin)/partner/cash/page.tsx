import { CodCash } from "@/components/shipments/Cod";
import { can, requireRoleKey } from "@/lib/session";

export default async function PartnerCashPage() {
  const user = await requireRoleKey(["carrier", "pickup_point_operator"]);
  return <CodCash canDeclare={can(user, "shipments.cod.collect")} canDecide={false} />;
}
