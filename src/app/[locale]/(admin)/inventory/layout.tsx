import { requirePermission } from "@/lib/session";

/** Stock, for holders of inventory.read (display only: the API checks every call and scopes what it returns). */
export default async function Layout({ children }: { children: React.ReactNode }) {
  await requirePermission("inventory.read");
  return children;
}
