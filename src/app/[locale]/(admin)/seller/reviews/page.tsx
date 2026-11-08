import { SellerReviews } from "@/components/sellers/SellerReviews";
import { requireRoleKey } from "@/lib/session";

export default async function SellerReviewsPage() {
  await requireRoleKey(["seller_owner", "seller_staff"]);
  return <SellerReviews />;
}
