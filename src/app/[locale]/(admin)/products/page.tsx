import { ProductSearch } from "./ProductSearch";
import { CatalogueSizes } from "./CatalogueSizes";
import { serverGet } from "@/lib/serverApi";
import { Provider } from "@/lib/types";

export default async function ProductsPage() {
  const providers = await serverGet<Provider[]>("/providers");
  return (
    <>
      <ProductSearch providers={providers ?? []} />
      <CatalogueSizes />
    </>
  );
}
