import { PricingRulesDashboard } from "./PricingRulesDashboard";
import { serverGet } from "@/lib/serverApi";
import { PricingRule } from "@/lib/types";

export default async function PricingPage() {
  const rules = await serverGet<PricingRule[]>("/pricing-rules");
  return <PricingRulesDashboard initialRules={rules ?? []} />;
}
