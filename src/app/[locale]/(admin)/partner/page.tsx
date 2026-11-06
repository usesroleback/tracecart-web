import { PartnerPortal } from "@/components/partners/Portal";
import { requireRoleKey } from "@/lib/session";

export default async function PartnerPage() {
  await requireRoleKey(["carrier", "pickup_point_operator"]);
  return <PartnerPortal />;
}
