"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { box, SignInGate } from "@/components/services/SignInGate";
import { percent, SellerPanel } from "./SellerPanel";

export function SellOnTracecart({ terms }: { terms: { commissionBps: number; payoutHoldDays: number; requiredDocuments: string[] } | null }) {
  const t = useTranslations("sellers");
  return (
    <div className="flex max-w-3xl flex-col gap-4">
      {terms ? (
        <section className={`${box} text-sm`} aria-labelledby="sell-terms">
          <h2 id="sell-terms" className="rb-title mb-2">
            {t("sell.terms")}
          </h2>
          <ul className="list-inside list-disc space-y-1">
            <li>{t("sell.termCommission", { rate: percent(terms.commissionBps) })}</li>
            <li>{t("sell.termHold", { days: terms.payoutHoldDays })}</li>
            <li>{t("sell.termDocuments", { documents: terms.requiredDocuments.map((k) => t(`kinds.${k}` as "kinds.OTHER")).join(", ") })}</li>
          </ul>
          <Link href="/sell/agreement" className="mt-2 inline-block font-medium underline">
            {t("sell.termAgreement")}
          </Link>
        </section>
      ) : null}
      <SignInGate title={t("sell.gateTitle")} lead={t("sell.gateLead")}>
        {() => <SellerPanel />}
      </SignInGate>
    </div>
  );
}
