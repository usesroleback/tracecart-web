import { CarrierApplicationsList } from "@/components/carriers/CarrierApplications";
import { can, requirePermission } from "@/lib/session";

export default async function CarrierApplicationsPage() {
  const user = await requirePermission("carriers.review");
  return <CarrierApplicationsList canEditSettings={can(user, "settings.write")} />;
}
