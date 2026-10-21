import { requireRole } from "@/lib/session";

export default async function Layout({ children }: { children: React.ReactNode }) {
  await requireRole("SUPER_ADMIN");
  return children;
}
