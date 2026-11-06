import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { ShipmentsList } from "@/components/shipments/Shipments";
import { requireRoleKey } from "@/lib/session";

export default async function PartnerDeliveriesPage({ searchParams }: { searchParams: Promise<{ queue?: string }> }) {
  await requireRoleKey(["carrier", "pickup_point_operator"]);
  const { queue } = await searchParams;
  if (!queue) return redirect({ href: "/partner/deliveries?queue=toMove", locale: await getLocale() });
  const t = await getTranslations("partners");
  return <ShipmentsList heading={t("deliveries")} intro={t("deliveriesLead")} />;
}
