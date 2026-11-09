import { PartnerPortal } from "@/components/partners/Portal";
import { PartnerDashboard } from "@/components/support/Support";
import { requireRoleKey } from "@/lib/session";

export default async function PartnerPage() {
  await requireRoleKey(["carrier", "pickup_point_operator"]);
  return (
    <>
      <PartnerDashboard />
      <PartnerPortal />
    </>
  );
}
