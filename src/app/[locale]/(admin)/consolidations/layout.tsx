import { requireAccess } from "@/lib/session";

export default async function Layout({ children }: { children: React.ReactNode }) {
  await requireAccess("logistics.consolidation.read", ["SUPER_ADMIN", "LOGISTICS_PARTNER"]);
  return children;
}
