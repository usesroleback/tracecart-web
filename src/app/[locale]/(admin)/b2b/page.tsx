import { B2bList } from "@/components/b2b/B2bAdmin";
import { requirePermission } from "@/lib/session";

export default async function B2bPage() {
  await requirePermission("customers.b2b.approve");
  return <B2bList />;
}
