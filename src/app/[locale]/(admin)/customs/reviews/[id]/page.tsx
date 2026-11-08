import { CustomsReviewDetail } from "@/components/customs/CustomsReviews";
import { requirePermission } from "@/lib/session";

export default async function CustomsReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePermission("customs.file.write");
  return <CustomsReviewDetail id={id} me={user.id} />;
}
