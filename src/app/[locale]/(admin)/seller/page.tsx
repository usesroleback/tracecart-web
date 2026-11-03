import { getTranslations } from "next-intl/server";
import { SellerPanel } from "@/components/sellers/SellerPanel";

/** The Seller Center: the seller's own account. Listings, orders and payouts join it. */
export default async function SellerCenterPage() {
  const t = await getTranslations("sellers");
  return (
    <div className="max-w-3xl">
      <h1 className="rb-headline mb-6 text-[28px]">{t("center")}</h1>
      <SellerPanel />
    </div>
  );
}
