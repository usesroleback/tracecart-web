import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SellerPanel } from "@/components/sellers/SellerPanel";
import { requireRoleKey } from "@/lib/session";

/** The Seller Center: the seller's own account. Listings sit beside it. */
export default async function SellerCenterPage() {
  await requireRoleKey("seller_owner");
  const t = await getTranslations("sellers");
  const listings = await getTranslations("listings");
  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <h1 className="rb-headline text-[28px]">{t("center")}</h1>
        <div className="flex flex-wrap gap-4">
          <Link href="/seller/listings" className="text-sm font-medium underline">
            {listings("mine")}
          </Link>
          <Link href="/seller/payouts" className="text-sm font-medium underline">
            {t("payoutsLink")}
          </Link>
          <Link href="/seller/staff" className="text-sm font-medium underline">
            {t("staffLink")}
          </Link>
          <Link href="/seller/inbounds" className="text-sm font-medium underline">
            {t("inboundLink")}
          </Link>
        </div>
      </div>
      <SellerPanel />
    </div>
  );
}
