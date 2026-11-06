import { requireAccess } from "@/lib/session";

export default async function Layout({ children }: { children: React.ReactNode }) {
  await requireAccess("logistics.carrier.read", ["SUPER_ADMIN"], "logistics.carrier.read");
  return children;
}
