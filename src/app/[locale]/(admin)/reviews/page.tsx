import { ReviewsList } from "@/components/reviews/ReviewsAdmin";
import { requirePermission } from "@/lib/session";

export default async function ReviewsPage() {
  await requirePermission("content.moderate");
  return <ReviewsList />;
}
