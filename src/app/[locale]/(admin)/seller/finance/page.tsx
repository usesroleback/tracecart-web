import { SellerFinance } from "@/components/finance/Finance";
import { requireRoleKey } from "@/lib/session";

export default async function Page() {
  await requireRoleKey("seller_owner");
  return <SellerFinance />;
}
