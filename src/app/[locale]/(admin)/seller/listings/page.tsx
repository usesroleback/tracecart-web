import { SellerListings } from "@/components/sellers/SellerListings";
import { requireRoleKey } from "@/lib/session";

export default async function SellerListingsPage() {
  await requireRoleKey(["seller_owner", "seller_staff"]);
  return <SellerListings />;
}
