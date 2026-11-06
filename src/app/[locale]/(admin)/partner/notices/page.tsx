import { getTranslations } from "next-intl/server";
import { Partners } from "@/components/partners/Partners";
import { requireRoleKey } from "@/lib/session";

export default async function PartnerNoticesPage() {
  await requireRoleKey(["carrier", "pickup_point_operator"]);
  const t = await getTranslations("partners");
  return <Partners canHandle={false} canSend canManage={false} heading={t("noticesLink")} intro={t("sendHint")} />;
}
