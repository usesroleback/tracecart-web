import { ListingDetail } from "@/components/sellers/ListingReview";
import { requirePermission } from "@/lib/session";

export default async function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requirePermission("catalog.listing.review");
  return <ListingDetail id={id} />;
}
