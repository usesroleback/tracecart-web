import { requirePermission } from "@/lib/session";

/** Grouped loads show what carriers cost: staff who assign carriers only (display only: the API checks every call). */
export default async function Layout({ children }: { children: React.ReactNode }) {
  await requirePermission("logistics.routing.assign");
  return children;
}
