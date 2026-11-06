import { SellerPayouts } from "@/components/sellers/Payouts";
import { requireRoleKey } from "@/lib/session";

export default async function SellerPayoutsPage() {
  await requireRoleKey("seller_owner");
  return <SellerPayouts />;
}
