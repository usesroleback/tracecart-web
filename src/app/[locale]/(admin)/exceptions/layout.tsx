import { requireAccess } from "@/lib/session";

export default async function Layout({ children }: { children: React.ReactNode }) {
  await requireAccess("logistics.exception.read", ["SUPER_ADMIN"], "logistics.exception.read");
  return children;
}
