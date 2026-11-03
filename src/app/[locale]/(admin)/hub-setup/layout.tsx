import { requirePermission } from "@/lib/session";

export default async function Layout({ children }: { children: React.ReactNode }) {
  await requirePermission(["sourcing.request.read", "pricing.settings.write"]);
  return children;
}
