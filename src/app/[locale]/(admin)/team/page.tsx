import { Team } from "@/components/team/Team";
import { requirePermission } from "@/lib/session";

export default async function Page() {
  await requirePermission("staff.manage");
  return <Team />;
}
