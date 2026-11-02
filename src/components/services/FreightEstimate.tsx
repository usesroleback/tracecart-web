"use client";

import { useTranslations } from "next-intl";
import { useFormat } from "@/lib/format";
import { toMajor } from "@/lib/currency";
import type { CargoEstimate, Indicative } from "./types";
import { box } from "./SignInGate";

/** The AI's reading of the goods and the indicative price, marked as an estimate with what it assumes (ADR-036). */
export function FreightEstimateView({ status, estimate, indicative, notGoods }: { status: "NONE" | "DONE" | "FAILED"; estimate: CargoEstimate | null; indicative: Indicative | null; notGoods?: boolean }) {
  const t = useTranslations("services.estimate");
  const format = useFormat();
  if (status !== "DONE" || !estimate) {
    return <p className={`${box} text-sm text-ink`}>{notGoods ? t("notGoods") : status === "FAILED" ? t("failed") : t("unavailable")}</p>;
  }
  const money = (minor: number, currency: string) => `${format.number(toMajor(minor, currency))} ${currency}`;
  const kg = (n: number) => format.number(n, 1);
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <section className={box}>
        <p className="rb-overline text-ink-muted">{t("cargoTitle")}</p>
        <p className="mt-1 font-medium text-ink">{estimate.summary}</p>
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <dt className="text-ink-muted">{t("packages")}</dt>
          <dd className="rb-numeral">{estimate.packageCount}</dd>
          <dt className="text-ink-muted">{t("weight")}</dt>
          <dd className="rb-numeral">{t("kgRange", { low: kg(estimate.weightKg.low), high: kg(estimate.weightKg.high) })}</dd>
          {estimate.volumeM3 != null ? (
            <>
              <dt className="text-ink-muted">{t("volume")}</dt>
              <dd className="rb-numeral">{format.number(estimate.volumeM3, 2)} m³</dd>
            </>
          ) : null}
          <dt className="text-ink-muted">{t("confidence")}</dt>
          <dd>{t(`confidenceLevel.${estimate.confidence}`)}</dd>
        </dl>
        {estimate.careFlags.length ? (
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {estimate.careFlags.map((f, i) => (
              <li key={i} title={f.reason} className="rounded-[var(--radius-xs)] bg-attn-soft px-2 py-0.5 text-xs text-ink">
                {t(`care.${f.kind}`)}
              </li>
            ))}
          </ul>
        ) : null}
        {estimate.restricted.length ? (
          <div className="mt-3 text-sm">
            <p className="font-medium text-critical">{t("restricted")}</p>
            <ul className="mt-1 list-disc pl-5 text-ink">
              {estimate.restricted.map((r, i) => (
                <li key={i}>{`${r.item}: ${r.reason}`}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {estimate.assumptions.length ? (
          <p className="mt-3 text-xs text-ink-muted">
            {t("assumes")} {estimate.assumptions.join(" · ")}
          </p>
        ) : null}
      </section>
      <section className={box}>
        <p className="rb-overline text-ink-muted">{t("priceTitle")}</p>
        {indicative?.available && indicative.low && indicative.high ? (
          <>
            <p className="rb-numeral mt-1 text-[22px] font-medium text-ink">
              {indicative.low.totalMinor === indicative.high.totalMinor
                ? money(indicative.low.totalMinor, indicative.currency)
                : t("range", { low: money(indicative.low.totalMinor, indicative.currency), high: money(indicative.high.totalMinor, indicative.currency) })}
            </p>
            {indicative.promise ? <p className="mt-1 text-sm text-ink">{t("window", { from: format.day(indicative.promise.from), to: format.day(indicative.promise.to) })}</p> : null}
            <p className="mt-3 text-xs text-ink-muted">{indicative.dutiesIncluded ? (indicative.crossBorder ? t("includesDuties") : t("domestic")) : t("dutiesLater")}</p>
          </>
        ) : (
          <p className="mt-1 text-sm text-ink">{t("noPrice")}</p>
        )}
        <p className="mt-3 rounded-[var(--radius-s)] bg-surface-sunken px-3 py-2 text-xs text-ink">{t("notAQuote")}</p>
      </section>
    </div>
  );
}
