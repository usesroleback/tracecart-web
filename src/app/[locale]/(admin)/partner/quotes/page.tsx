import { CarrierQuotesList } from "@/components/carriers/CarrierQuotes";
import { requireRoleKey } from "@/lib/session";

/** Quote requests for freight, sent to the carrier's company (ADR-081). */
export default async function PartnerQuotesPage() {
  await requireRoleKey("carrier");
  return <CarrierQuotesList />;
}
