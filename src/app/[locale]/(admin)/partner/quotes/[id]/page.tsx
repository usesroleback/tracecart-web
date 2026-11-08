import { CarrierQuoteDetail } from "@/components/carriers/CarrierQuotes";
import { requireRoleKey } from "@/lib/session";

export default async function PartnerQuotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireRoleKey("carrier");
  return <CarrierQuoteDetail id={id} />;
}
