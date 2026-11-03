import { requireAccess } from "@/lib/session";

export default async function Layout({ children }: { children: React.ReactNode }) {
  await requireAccess("orders.transition", ["LOGISTICS_PARTNER"]);
  return children;
}
