import { requirePermission } from "@/lib/session";

/** Cash on delivery, for those who collect it or account for it (display only: the API checks every call and scopes what it returns). */
export default async function Layout({ children }: { children: React.ReactNode }) {
  await requirePermission(["shipments.cod.collect", "payments.read"]);
  return children;
}
