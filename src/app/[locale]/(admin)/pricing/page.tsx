import { PricingRulesDashboard } from "./PricingRulesDashboard";
import { PricingSettings } from "./PricingSettings";
import { serverGet } from "@/lib/serverApi";
import { PricingRule, PricingSettings as Settings } from "@/lib/types";

export default async function PricingPage() {
  const [rules, settings] = await Promise.all([serverGet<PricingRule[]>("/pricing-rules"), serverGet<Settings>("/pricing-settings")]);
  return (
    <>
      {/* The steps first; rules only refine the quotes they give. */}
      {settings && <PricingSettings initial={settings} />}
      <div className="mt-12">
        <PricingRulesDashboard initialRules={rules ?? []} />
      </div>
    </>
  );
}
