import { ListingsList } from "@/components/sellers/ListingReview";
import { requirePermission } from "@/lib/session";

export default async function ListingsPage() {
  await requirePermission("catalog.listing.review");
  return <ListingsList />;
}
