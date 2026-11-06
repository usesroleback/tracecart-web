import { requireRoleKey } from "@/lib/session";

/** Carriers and pickup points: the Partner portal. Staff handle notices elsewhere. */
export default async function Layout({ children }: { children: React.ReactNode }) {
  await requireRoleKey(["carrier", "pickup_point_operator"]);
  return children;
}
