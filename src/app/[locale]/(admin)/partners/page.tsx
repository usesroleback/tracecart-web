import { Partners } from "@/components/partners/Partners";
import { can, getSessionState } from "@/lib/session";

export default async function PartnersPage() {
  const state = await getSessionState();
  const user = state.status === "ok" ? state.user : null;
  const handles = !!user && can(user, "partners.notice.handle");
  // Staff holding every permission handle notices: only partners send them.
  return <Partners canHandle={handles} canSend={!handles && !!user && can(user, "partners.notice.send")} canManage={!!user && can(user, "partners.manage")} />;
}
