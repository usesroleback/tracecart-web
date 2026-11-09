import { SupportDesk } from "@/components/support/Support";
import { can, requirePermission } from "@/lib/session";

export default async function Page() {
  const user = await requirePermission("support.ticket.read");
  return <SupportDesk canWrite={can(user, "support.ticket.write")} myId={user.id} />;
}
