import { requireAccess } from "@/lib/session";

export default async function Layout({ children }: { children: React.ReactNode }) {
  await requireAccess("orders.read", ["SUPER_ADMIN"], "orders.shipment.write");
  return children;
}
