import { requirePermission } from "@/lib/session";

export default async function Layout({ children }: { children: React.ReactNode }) {
  await requirePermission(["sellers.review", "finance.payout.read", "settings.read"]);
  return children;
}
