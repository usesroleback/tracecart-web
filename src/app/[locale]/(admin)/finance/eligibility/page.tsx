import { SettlementEligibility } from "@/components/finance/Finance";
import { requirePermission } from "@/lib/session";

export default async function Page() {
  await requirePermission("finance.payout.read");
  return <SettlementEligibility />;
}
