import { CustomsConsole } from "@/components/customs/CustomsRules";
import { can, requirePermission } from "@/lib/session";

/** Customs knowledge: corridor, rules, category headings (ADR-082). */
export default async function CustomsPage() {
  const user = await requirePermission(["customs.rate.write", "customs.file.write", "compliance.review"]);
  return <CustomsConsole canWrite={can(user, "customs.rate.write")} canHeadings={can(user, "customs.file.write")} />;
}
