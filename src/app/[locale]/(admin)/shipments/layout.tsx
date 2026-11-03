import { requirePermission } from "@/lib/session";

/** Shipments, for holders of shipments.read (display only: the API checks every call and scopes what it returns). */
export default async function Layout({ children }: { children: React.ReactNode }) {
  await requirePermission("shipments.read");
  return children;
}
