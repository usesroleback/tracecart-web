import { SellerInbound } from "@/components/sellers/Inbound";
import { requireRoleKey } from "@/lib/session";

export default async function SellerInboundPage() {
  await requireRoleKey(["seller_owner", "seller_staff"]);
  return <SellerInbound />;
}
