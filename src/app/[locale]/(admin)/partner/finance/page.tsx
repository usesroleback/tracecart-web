import { CarrierFinance } from "@/components/finance/Finance";
import { requireRoleKey } from "@/lib/session";

export default async function Page() {
  await requireRoleKey("carrier");
  return <CarrierFinance />;
}
