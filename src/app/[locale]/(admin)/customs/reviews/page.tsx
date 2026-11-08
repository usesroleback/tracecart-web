import { CustomsReviewsList } from "@/components/customs/CustomsReviews";
import { requirePermission } from "@/lib/session";

export default async function CustomsReviewsPage() {
  await requirePermission("customs.file.write");
  return <CustomsReviewsList />;
}
