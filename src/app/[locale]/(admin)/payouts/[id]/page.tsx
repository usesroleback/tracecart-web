import { PayoutDetail } from "@/components/sellers/Payouts";
import { requirePermission } from "@/lib/session";

export default async function PayoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requirePermission("finance.payout.read");
  return <PayoutDetail id={id} staff />;
}
