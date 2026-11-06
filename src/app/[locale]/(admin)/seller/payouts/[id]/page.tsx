import { PayoutDetail } from "@/components/sellers/Payouts";
import { requireRoleKey } from "@/lib/session";

export default async function SellerPayoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireRoleKey("seller_owner");
  return <PayoutDetail id={id} staff={false} />;
}
