import { PricingRulesDashboard } from "./PricingRulesDashboard";
import { PricingSettings } from "./PricingSettings";
import { serverGet } from "@/lib/serverApi";
import { PricingRule, PricingSettings as Settings } from "@/lib/types";

export default async function PricingPage() {
  const [rules, settings] = await Promise.all([serverGet<PricingRule[]>("/pricing-rules"), serverGet<Settings>("/pricing-settings")]);
  return (
    <>
      <PricingRulesDashboard initialRules={rules ?? []} />
      {settings && <PricingSettings initial={settings} />}
    </>
  );
}
