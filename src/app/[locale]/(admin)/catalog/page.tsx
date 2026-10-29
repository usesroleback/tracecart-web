import { ProductsTable } from "@/components/catalog-admin/ProductsTable";
import { can, getSessionState } from "@/lib/session";

export default async function CatalogPage() {
  const state = await getSessionState();
  return <ProductsTable canWrite={state.status === "ok" && can(state.user, "catalog.product.write")} />;
}
