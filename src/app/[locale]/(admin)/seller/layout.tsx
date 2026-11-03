import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { requirePermission, ROLE_HOME } from "@/lib/session";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const user = await requirePermission("seller.settings.write");
  // Staff hold every staff permission, but a shop isn't theirs: this is for its owner.
  if (!user.roles?.includes("seller_owner")) return redirect({ href: ROLE_HOME[user.role], locale: await getLocale() });
  return children;
}
