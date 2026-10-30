import { requirePermission } from "@/lib/session";

/** Store orders, for holders of orders.store.read (display only: the API checks every call). */
export default async function Layout({ children }: { children: React.ReactNode }) {
  await requirePermission("orders.store.read");
  return children;
}
