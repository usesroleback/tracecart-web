import { SellersList } from "@/components/sellers/SellersAdmin";
import { requirePermission } from "@/lib/session";

export default async function SellersPage() {
  await requirePermission("sellers.review");
  return <SellersList />;
}
