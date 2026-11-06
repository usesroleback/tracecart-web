import { CouponsAdmin } from "@/components/promotions/CouponsAdmin";
import { requirePermission } from "@/lib/session";

export default async function CouponsPage() {
  await requirePermission("promotions.write");
  return <CouponsAdmin />;
}
