import { requirePermission } from "@/lib/session";

/** Refunds, for finance and those who ask for them (display only: the API checks every call). */
export default async function Layout({ children }: { children: React.ReactNode }) {
  await requirePermission(["payments.read", "orders.refund"]);
  return children;
}
