import { requirePermission } from "@/lib/session";

/** Returns, for holders of returns.read (display only: the API checks every call and scopes what it returns). */
export default async function Layout({ children }: { children: React.ReactNode }) {
  await requirePermission("returns.read");
  return children;
}
