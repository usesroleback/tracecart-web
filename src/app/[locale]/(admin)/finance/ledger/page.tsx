import { LedgerExplorer } from "@/components/finance/Finance";
import { requirePermission } from "@/lib/session";

export default async function Page() {
  await requirePermission("finance.report.read");
  return <LedgerExplorer />;
}
