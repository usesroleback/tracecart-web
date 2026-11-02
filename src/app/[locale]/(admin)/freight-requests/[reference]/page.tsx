import { FreightDetail } from "@/components/freight-admin/FreightAdmin";
import { can, getSessionState } from "@/lib/session";

export default async function FreightRequestPage({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  const state = await getSessionState();
  const user = state.status === "ok" ? state.user : null;
  return <FreightDetail reference={reference} canQuote={!!user && can(user, "freight.quote.send")} />;
}
