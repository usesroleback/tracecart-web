import { ProductEditor } from "@/components/catalog-admin/ProductEditor";
import { can, getSessionState } from "@/lib/session";

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const state = await getSessionState();
  const user = state.status === "ok" ? state.user : null;
  return <ProductEditor productId={id} canWrite={!!user && can(user, "catalog.product.write")} canWriteOffers={!!user && can(user, "catalog.offer.write")} />;
}
