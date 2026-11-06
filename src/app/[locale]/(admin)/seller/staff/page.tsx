import { SellerStaff } from "@/components/sellers/Staff";
import { requireRoleKey } from "@/lib/session";

export default async function SellerStaffPage() {
  await requireRoleKey("seller_owner");
  return <SellerStaff />;
}
