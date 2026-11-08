import { requirePermission } from "@/lib/session";

export default async function Layout({ children }: { children: React.ReactNode }) {
  await requirePermission("carriers.review");
  return children;
}
