import { ProductEditor } from "@/components/catalog-admin/ProductEditor";
import { requirePermission } from "@/lib/session";

export default async function NewProductPage() {
  await requirePermission("catalog.product.write");
  return <ProductEditor canWrite canWriteOffers={false} />;
}
