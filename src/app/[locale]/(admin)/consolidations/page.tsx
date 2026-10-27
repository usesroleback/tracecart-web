import { Consolidations } from "@/components/tracecart/Consolidations";
import { getSessionState } from "@/lib/session";
import { serverGet } from "@/lib/serverApi";
import { Consolidation, ConsolidationSuggestion } from "@/lib/types";

/** Groupages: the administrateur forms them where they pay; the carrier carries them as one. */
export default async function ConsolidationsPage() {
  const state = await getSessionState();
  const admin = state.status === "ok" && state.user.role === "SUPER_ADMIN";
  const [groups, suggestions] = await Promise.all([
    serverGet<Consolidation[]>("/consolidations"),
    admin ? serverGet<ConsolidationSuggestion[]>("/consolidations/suggestions") : Promise.resolve([]),
  ]);
  return <Consolidations view={admin ? "admin" : "carrier"} initialGroups={groups ?? []} initialSuggestions={suggestions ?? []} />;
}
