import { RefundsList } from "@/components/returns/Returns";
import { can, getSessionState } from "@/lib/session";

export default async function RefundsPage() {
  const state = await getSessionState();
  const user = state.status === "ok" ? state.user : null;
  return <RefundsList userId={user?.id ?? ""} canPay={!!user && can(user, "payments.refund.pay")} canApprove={!!user && can(user, "finance.refund.approve")} />;
}
