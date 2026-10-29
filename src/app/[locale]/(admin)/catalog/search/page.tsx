import { SearchAdmin } from "@/components/catalog-admin/SearchAdmin";
import { requirePermission } from "@/lib/session";

export default async function SearchTuningPage() {
  await requirePermission("search.tune");
  return <SearchAdmin />;
}
