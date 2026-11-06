import { SellerListingEditor } from "@/components/sellers/SellerListings";
import { requireRoleKey } from "@/lib/session";

export default async function NewListingPage() {
  await requireRoleKey(["seller_owner", "seller_staff"]);
  return <SellerListingEditor />;
}
