import { RuleDetail } from "@/components/customs/CustomsRules";
import { can, requirePermission } from "@/lib/session";

export default async function CustomsRulePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePermission(["customs.rate.write", "customs.file.write", "compliance.review"]);
  return <RuleDetail id={id} canWrite={can(user, "customs.rate.write")} />;
}
