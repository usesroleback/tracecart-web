import { BrandsAdmin } from "@/components/catalog-admin/BrandsAdmin";
import { can, getSessionState } from "@/lib/session";

export default async function BrandsPage() {
  const state = await getSessionState();
  return <BrandsAdmin canWrite={state.status === "ok" && can(state.user, "catalog.brand.write")} />;
}
