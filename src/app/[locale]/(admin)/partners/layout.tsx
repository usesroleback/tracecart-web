import { requirePermission } from "@/lib/session";

/** Partners, for staff who handle them and partners themselves (display only: the API checks every call). */
export default async function Layout({ children }: { children: React.ReactNode }) {
  await requirePermission(["partners.notice.handle", "partners.notice.send", "partners.manage"]);
  return children;
}
