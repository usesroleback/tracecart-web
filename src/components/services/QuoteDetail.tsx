"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { useFormat } from "@/lib/format";
import { toMajor } from "@/lib/currency";
import { AddressForm } from "@/components/checkout/Checkout";
import { call } from "@/components/checkout/http";
import type { Address, PaymentMethod, PaymentView, PickupPoint } from "@/components/checkout/types";
import type { CustomerQuote } from "./types";
import { box, SignInGate } from "./SignInGate";

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/** One quote: what it covers, the delivered total, the window and the validity; accepted and paid here (ADR-038). */
export function QuoteDetail({ reference }: { reference: string }) {
  const t = useTranslations("services.quote");
  return (
    <SignInGate title={t("signInTitle")} lead={t("signInLead")}>
      {() => <QuoteBody reference={reference} />}
    </SignInGate>
  );
}

function QuoteBody({ reference }: { reference: string }) {
  const t = useTranslations("services.quote");
  const tc = useTranslations("checkout.checkout");
  const format = useFormat();
  const [quote, setQuote] = useState<CustomerQuote | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => call<CustomerQuote>("GET", `/me/quotes/${reference}`).then(setQuote, () => setFailed(true)), [reference]);
  useEffect(() => {
    load();
  }, [load]);

  if (failed) return <p className="text-critical">{t("notFound")}</p>;
  if (!quote) return <p className="text-ink-muted">{t("loading")}</p>;
  const money = (minor: number) => `${format.number(toMajor(minor, quote.currency))} ${quote.currency}`;
  const rows = (["itemMinor", "shippingMinor", "dutiesMinor", "taxesMinor", "feesMinor"] as const).filter((k) => quote.totals[k] > 0);

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
      <section className={box}>
        <p className="rb-overline text-ink-muted">{t(`kind.${quote.kind}`)}</p>
        <h1 className="rb-headline mt-1 text-[26px]">{quote.title}</h1>
        {quote.quantity > 1 ? <p className="text-sm text-ink-muted">{t("quantity", { count: quote.quantity })}</p> : null}
        <p className="mt-1 text-sm text-ink-muted">{quote.request.description}</p>
        {quote.note ? <p className="mt-4 whitespace-pre-line rounded-[var(--radius-s)] bg-surface-sunken px-4 py-3 text-sm text-ink">{quote.note}</p> : null}
        <dl className="mt-5 grid gap-1.5 text-sm">
          {rows.map((k) => (
            <div key={k} className="flex justify-between gap-3">
              <dt className="text-ink-muted">{t(`totals.${k}`)}</dt>
              <dd className="rb-numeral">{money(quote.totals[k])}</dd>
            </div>
          ))}
          <div className="mt-1 flex justify-between gap-3 border-t border-line pt-2 text-base font-medium">
            <dt>{t("total")}</dt>
            <dd className="rb-numeral">{money(quote.totals.totalMinor)}</dd>
          </div>
        </dl>
        <p className="mt-3 text-sm text-ink">{tc("arrives", { from: format.day(quote.promise.from), to: format.day(quote.promise.to) })}</p>
        <p className="mt-1 text-xs text-ink-muted">{tc("allIncluded")}</p>
      </section>
      <aside className="grid content-start gap-4">
        <div className={box}>
          <p className="text-sm">
            <span className="font-medium">{t(`status.${quote.status}`)}</span>
            {quote.status === "SENT" ? <span className="text-ink-muted"> · {t("validUntil", { date: format.date(quote.validUntil) })}</span> : null}
          </p>
          {quote.order ? (
            <Link href={`/account/orders/${quote.order.reference}`} className="mt-3 inline-block font-medium text-ink underline">
              {t("seeOrder", { reference: quote.order.reference })}
            </Link>
          ) : null}
        </div>
        {quote.status === "SENT" ? <Accept quote={quote} onDeclined={load} /> : null}
      </aside>
    </div>
  );
}

function Accept({ quote, onDeclined }: { quote: CustomerQuote; onDeclined: () => void }) {
  const t = useTranslations("services.quote");
  const tc = useTranslations("checkout.checkout");
  const router = useRouter();
  const format = useFormat();
  const needsDelivery = quote.kind === "SOURCING";
  const pickup = quote.destination.method === "PICKUP";
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [points, setPoints] = useState<PickupPoint[]>([]);
  const [choice, setChoice] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const methods = (quote.paymentMethods ?? []).filter((m) => m.available);
  const [payment, setPayment] = useState<PaymentMethod | null>(methods[0]?.method ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const here = (p: { countryCode: string; city: string }) => p.countryCode.toUpperCase() === quote.destination.countryCode.toUpperCase() && fold(p.city) === fold(quote.destination.city);

  const loadPlaces = useCallback(async () => {
    if (!needsDelivery) return;
    if (pickup) {
      const { pickupPoints } = await call<{ pickupPoints: PickupPoint[] }>("GET", `/checkout/pickup-points?country=${quote.destination.countryCode}`);
      const mine = pickupPoints.filter(here);
      setPoints(mine);
      setChoice((c) => c ?? mine[0]?.id ?? null);
    } else {
      const { addresses } = await call<{ addresses: Address[] }>("GET", "/me/addresses");
      const mine = addresses.filter(here);
      setAddresses(mine);
      setChoice((c) => c ?? mine[0]?.id ?? null);
      if (!mine.length) setAdding(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the quote's place doesn't change
  }, [needsDelivery, pickup]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loads the places once; state is set after the request answers
    loadPlaces();
  }, [loadPlaces]);

  async function accept() {
    if (!payment) return;
    if (needsDelivery && !choice) return setError(t("chooseDelivery"));
    setBusy(true);
    setError(null);
    try {
      const delivery = needsDelivery ? (pickup ? { method: "PICKUP", pickupPointId: choice } : { method: "HOME", addressId: choice }) : undefined;
      const res = await call<{ reference: string; payment: PaymentView }>("POST", `/me/quotes/${quote.reference}/accept`, {
        paymentMethod: payment,
        expectedTotalMinor: quote.totals.totalMinor,
        ...(delivery ? { delivery } : {}),
      });
      if (res.payment.checkoutUrl) window.location.assign(res.payment.checkoutUrl);
      else router.push(`/checkout/done/${res.reference}`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  async function decline() {
    if (!window.confirm(t("confirmDecline"))) return;
    await call("POST", `/me/quotes/${quote.reference}/decline`);
    onDeclined();
  }

  return (
    <div className={`${box} grid gap-4`}>
      {needsDelivery ? (
        <fieldset className="grid gap-2">
          <legend className="rb-label mb-1">{t(pickup ? "pickupIn" : "deliverIn", { city: quote.destination.city })}</legend>
          {(pickup ? points : addresses).map((p) => (
            <label key={p.id} className="flex items-start gap-2 text-sm">
              <input type="radio" name="place" checked={choice === p.id} onChange={() => setChoice(p.id)} className="mt-1" />
              <span>{"name" in p ? `${p.name} · ${p.addressLine}` : `${p.recipientName} · ${p.landmark}`}</span>
            </label>
          ))}
          {pickup && !points.length ? <p className="text-sm text-ink-muted">{tc("noPickupPoints")}</p> : null}
          {!pickup ? (
            adding ? (
              <AddressForm
                fixed={quote.destination}
                onSaved={async (id) => {
                  setChoice(id);
                  setAdding(false);
                  await loadPlaces();
                }}
                onCancel={addresses.length ? () => setAdding(false) : undefined}
              />
            ) : (
              <button type="button" className="justify-self-start text-sm text-ink underline" onClick={() => setAdding(true)}>
                {tc("addAddress")}
              </button>
            )
          ) : null}
        </fieldset>
      ) : null}
      <fieldset className="grid gap-2">
        <legend className="rb-label mb-1">{tc("payment")}</legend>
        {(quote.paymentMethods ?? []).map((m) => (
          <label key={m.method} className={`flex items-start gap-2 text-sm ${m.available ? "" : "opacity-60"}`}>
            <input type="radio" name="payment" disabled={!m.available} checked={payment === m.method} onChange={() => setPayment(m.method)} className="mt-1" />
            <span>
              <span className="font-medium">{tc(`paymentMethods.${m.method}`)}</span>
              <br />
              <span className="text-ink-muted">{m.available ? tc(`paymentHints.${m.method}`) : m.blockers.map((b) => tc(`blockers.${b}` as "blockers.NOT_CONFIGURED")).join(" ")}</span>
            </span>
          </label>
        ))}
      </fieldset>
      {error ? <p role="alert" className="text-sm text-critical">{error}</p> : null}
      <button type="button" disabled={busy || !payment} onClick={accept} className="rounded-[var(--radius-s)] bg-ink px-5 py-3 font-medium text-ink-inverse disabled:opacity-60">
        {busy ? t("accepting") : t("accept", { total: `${format.number(toMajor(quote.totals.totalMinor, quote.currency))} ${quote.currency}` })}
      </button>
      <button type="button" onClick={decline} className="justify-self-start text-sm text-ink-muted underline">
        {t("decline")}
      </button>
    </div>
  );
}
