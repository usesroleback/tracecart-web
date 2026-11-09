import { CarrierPayables } from "@/components/finance/Finance";
import { can, requirePermission } from "@/lib/session";

export default async function Page() {
  const user = await requirePermission("finance.payout.read");
  return <CarrierPayables canReconcile={can(user, "payments.reconcile")} canApprove={can(user, "finance.payout.approve")} />;
}
