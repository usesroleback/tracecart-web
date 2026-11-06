import { SellerListingEditor } from "@/components/sellers/SellerListings";
import { requireRoleKey } from "@/lib/session";

export default async function SellerListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireRoleKey(["seller_owner", "seller_staff"]);
  return <SellerListingEditor id={id} />;
}
