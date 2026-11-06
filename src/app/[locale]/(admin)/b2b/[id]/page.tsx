import { B2bDetail } from "@/components/b2b/B2bAdmin";
import { requirePermission } from "@/lib/session";

export default async function B2bCompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requirePermission("customers.b2b.approve");
  return <B2bDetail id={id} />;
}
