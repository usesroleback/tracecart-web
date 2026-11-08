import { GiftCardsAdmin } from "@/components/promotions/GiftCardsAdmin";
import { requirePermission } from "@/lib/session";

export default async function GiftCardsPage() {
  await requirePermission("promotions.write");
  return <GiftCardsAdmin />;
}
