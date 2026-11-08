import { CarrierApplicationDetail } from "@/components/carriers/CarrierApplications";
import { requirePermission } from "@/lib/session";

export default async function CarrierApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePermission("carriers.review");
  return <CarrierApplicationDetail id={id} ownEmail={user.email} />;
}
