import { CategoriesAdmin } from "@/components/catalog-admin/CategoriesAdmin";
import { can, getSessionState } from "@/lib/session";

export default async function CategoriesPage() {
  const state = await getSessionState();
  return <CategoriesAdmin canWrite={state.status === "ok" && can(state.user, "catalog.category.write")} />;
}
