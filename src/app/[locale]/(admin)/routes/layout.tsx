import { requireAccess } from "@/lib/session";

export default async function Layout({ children }: { children: React.ReactNode }) {
  await requireAccess("logistics.carrier_service.read", ["LOGISTICS_PARTNER"]);
  return children;
}
