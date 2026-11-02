"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useFormat } from "@/lib/format";
import { toMajor } from "@/lib/currency";
import { countryName } from "@/lib/country";
import { call } from "@/components/checkout/http";
import { FreightEstimateView } from "./FreightEstimate";
import { box, SignInGate } from "./SignInGate";
import type { FreightRequestView } from "./types";

/** One of the customer's freight requests: where it stands, the estimate, and the agent's quotes. */
export function FreightDetail({ reference }: { reference: string }) {
  const t = useTranslations("services.freightRequest");
  return (
    <SignInGate title={t("signInTitle")} lead={t("signInLead")}>
      {() => <Body reference={reference} />}
    </SignInGate>
  );
}

function Body({ reference }: { reference: string }) {
  const t = useTranslations("services.freightRequest");
  const tq = useTranslations("services.quote");
  const locale = useLocale();
  const format = useFormat();
  const [r, setR] = useState<FreightRequestView | null>(null);
  const [failed, setFailed] = useState(false);
  const load = useCallback(() => call<FreightRequestView>("GET", `/me/freight-requests/${reference}`).then(setR, () => setFailed(true)), [reference]);
  useEffect(() => {
    load();
  }, [load]);

  if (failed) return <p className="text-critical">{t("notFound")}</p>;
  if (!r) return <p className="text-ink-muted">{t("loading")}</p>;
  const place = (p: FreightRequestView["origin"]) => `${p.city}, ${countryName(p.countryCode, locale)}`;
  const open = r.quotes.filter((q) => q.status === "SENT" || q.status === "ACCEPTED");

  async function cancel() {
    if (!window.confirm(t("confirmCancel"))) return;
    await call("POST", `/me/freight-requests/${reference}/cancel`);
    await load();
  }

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="rb-mono text-sm text-ink-muted">{r.reference}</p>
          <h1 className="rb-headline text-[26px]">{t("route", { from: place(r.origin), to: place(r.destination) })}</h1>
          <p className="mt-1 text-sm text-ink-muted">{r.description}</p>
        </div>
        <p className="rounded-full bg-surface-sunken px-3 py-1 text-sm font-medium">{t(`status.${r.status}`)}</p>
      </div>
      {open.length ? (
        <section className={box}>
          <h2 className="rb-title">{t("quotesTitle")}</h2>
          <ul className="mt-2 grid gap-2">
            {open.map((q) => (
              <li key={q.reference} className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-2 last:border-b-0">
                <span className="text-sm">
                  <span className="rb-numeral font-medium">{`${format.number(toMajor(q.totals.totalMinor, q.currency))} ${q.currency}`}</span>
                  <span className="text-ink-muted"> · {tq(`status.${q.status}`)}</span>
                  {q.status === "SENT" ? <span className="text-ink-muted"> · {tq("validUntil", { date: format.date(q.validUntil) })}</span> : null}
                </span>
                <Link href={`/account/quotes/${q.reference}`} className="rounded-[var(--radius-s)] bg-ink px-4 py-2 text-sm font-medium text-ink-inverse">
                  {q.status === "SENT" ? t("seeQuote") : t("seeDetails")}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p className={`${box} text-sm text-ink`}>{r.status === "SUBMITTED" ? t("waiting") : t("noQuote")}</p>
      )}
      <h2 className="rb-title">{t("estimateTitle")}</h2>
      <FreightEstimateView status={r.estimateStatus} estimate={r.estimate} indicative={r.indicative} />
      {r.status === "SUBMITTED" || r.status === "QUOTED" ? (
        <button type="button" onClick={cancel} className="justify-self-start text-sm text-ink-muted underline">
          {t("cancel")}
        </button>
      ) : null}
    </div>
  );
}
