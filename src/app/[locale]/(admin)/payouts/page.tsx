import { FinancePayouts } from "@/components/sellers/Payouts";
import { requirePermission } from "@/lib/session";

export default async function PayoutsPage() {
  await requirePermission("finance.payout.read");
  return <FinancePayouts />;
}
