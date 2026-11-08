import { requirePermission } from "@/lib/session";

export default async function Layout({ children }: { children: React.ReactNode }) {
  await requirePermission(["customs.rate.write", "customs.file.write", "compliance.review"]);
  return children;
}
