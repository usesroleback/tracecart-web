import { AuditLog } from "@/components/team/Team";
import { requirePermission } from "@/lib/session";

export default async function Page() {
  await requirePermission("audit.read");
  return <AuditLog />;
}
