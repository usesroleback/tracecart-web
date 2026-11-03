import { SellerSettings } from "@/components/sellers/SellersAdmin";
import { can, getSessionState } from "@/lib/session";

export default async function SellerSettingsPage() {
  const state = await getSessionState();
  return <SellerSettings canWrite={state.status === "ok" && can(state.user, "settings.write")} />;
}
