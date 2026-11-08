import { DealsAdmin } from "@/components/promotions/DealsAdmin";
import { requirePermission } from "@/lib/session";

export default async function DealsPage() {
  await requirePermission("promotions.write");
  return <DealsAdmin />;
}
