import { ImportAdmin } from "@/components/catalog-admin/ImportAdmin";
import { can, getSessionState } from "@/lib/session";

export default async function ImportPage() {
  const state = await getSessionState();
  return <ImportAdmin canImport={state.status === "ok" && can(state.user, "catalog.import")} />;
}
