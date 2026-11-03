import { SellerDetail } from "@/components/sellers/SellersAdmin";
import { can, requirePermission } from "@/lib/session";

export default async function SellerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePermission("sellers.review");
  return <SellerDetail id={id} canSetCommission={can(user, "settings.write")} ownId={user.email} />;
}
