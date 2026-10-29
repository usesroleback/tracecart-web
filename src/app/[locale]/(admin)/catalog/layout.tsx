import { requirePermission } from "@/lib/session";

/** The store's catalogue, for holders of catalog.read (display only: the API checks every call). */
export default async function Layout({ children }: { children: React.ReactNode }) {
  await requirePermission("catalog.read");
  return children;
}
