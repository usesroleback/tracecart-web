import { SourcingDashboard } from "./SourcingDashboard";
import { serverGet } from "@/lib/serverApi";
import { Paginated, SourcingRequest } from "@/lib/types";

export default async function SourcingPage() {
  const result = await serverGet<Paginated<SourcingRequest>>("/sourcing-requests?limit=100");
  return <SourcingDashboard initialRequests={result?.items ?? []} initialTotal={result?.total ?? 0} />;
}
