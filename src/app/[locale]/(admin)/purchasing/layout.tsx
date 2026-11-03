import { requirePermission } from "@/lib/session";

/** Purchasing, for buyers, receivers and customs (display only: the API checks every call and scopes what it returns). */
export default async function Layout({ children }: { children: React.ReactNode }) {
  await requirePermission(["purchasing.po.read", "inventory.receive", "customs.file.write"]);
  return children;
}
