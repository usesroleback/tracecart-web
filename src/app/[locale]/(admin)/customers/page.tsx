import { Customers } from "@/components/team/Team";
import { requirePermission } from "@/lib/session";

export default async function Page() {
  await requirePermission("customers.read");
  return <Customers />;
}
