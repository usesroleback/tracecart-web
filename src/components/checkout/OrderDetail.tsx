"use client";

import { useCallback, useEffect, useState } from "react";
import { OrderShipments } from "@/components/shipments/Shipments";
import { OrderReturns } from "@/components/returns/MyReturns";
import { useLocale, useTranslations } from "next-intl";
import { useAuth, useClerk } from "@clerk/nextjs";
import { Link } from "@/i18n/navigation";
import { useFormat } from "@/lib/format";
import { toMajor } from "@/lib/currency";
import { call } from "./http";
import type { OrderView, PaymentView } from "./types";

const box = "rounded-[var(--radius-m)] border border-line bg-surface-raised p-5";

/** One order, as its customer sees it: where it stands, what to do (pay, transfer), its lines and invoice. */
export function OrderDetail({ reference, confirmation = false }: { reference: string; confirmation?: boolean }) {
  const t = useTranslations("checkout.order");
  const locale = useLocale();
  const format = useFormat();
  const { isLoaded, isSignedIn } = useAuth();
  const clerk = useClerk();
  const [order, setOrder] = useState<OrderView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setOrder(await call<OrderView>("GET", `/me/orders/${reference}`));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [reference]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isLoaded && isSignedIn) load();
  }, [isLoaded, isSignedIn, load]);

  // Back from a payment page: the provider's word may take a moment.
  useEffect(() => {
    if (!order || order.status !== "PENDING_PAYMENT" || !confirmation) return;
    const timer = setTimeout(load, 4000);
    return () => clearTimeout(timer);
  }, [order, confirmation, load]);

  if (!isLoaded) return null;
  if (!isSignedIn) {
    const here = typeof window === "undefined" ? "" : window.location.href;
    return (
      <div className={`${box} mx-auto max-w-lg text-center`}>
        <p>{t("signIn")}</p>
        <button type="button" className="mt-4 rounded-[var(--radius-s)] bg-ink px-5 py-3 font-medium text-ink-inverse" onClick={() => clerk.openSignIn({ forceRedirectUrl: here })}>
          {t("signInCta")}
        </button>
      </div>
    );
  }
  if (error) return <p className="text-critical">{error}</p>;
  if (!order) return <p className="text-ink-muted">{t("loading")}</p>;

  const money = (minor: number) => `${format.number(toMajor(minor, order.currency))} ${order.currency}`;
  const day = (iso: string) => new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString(locale === "en" ? "en-GB" : "fr-FR", { weekday: "long", day: "numeric", month: "long" });
  // The latest payment other than a gift card's part, which is captured with the order (ADR-071).
  const payment: PaymentView | undefined = order.payments.filter((p) => p.method !== "GIFT_CARD" || order.paymentMethod === "GIFT_CARD").at(-1);
  const byGiftCard = order.payments.filter((p) => p.method === "GIFT_CARD" && p.status === "CAPTURED").reduce((sum, p) => sum + p.amountMinor, 0);

  async function pay() {
    setBusy(true);
    try {
      const p = await call<PaymentView>("POST", `/me/orders/${reference}/pay`, undefined, { "Idempotency-Key": crypto.randomUUID() });
      if (p.checkoutUrl) window.location.href = p.checkoutUrl;
      else await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    if (!window.confirm(t("confirmCancel"))) return;
    setBusy(true);
    try {
      setOrder(await call<OrderView>("POST", `/me/orders/${reference}/cancel`));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const headline =
    order.status === "CANCELLED"
      ? t("headline.cancelled")
      : order.status === "PENDING_APPROVAL"
        ? t("headline.awaitingApproval")
        : order.status === "PENDING_PAYMENT"
        ? order.paymentMethod === "BANK_TRANSFER"
          ? t("headline.awaitingTransfer")
          : t("headline.awaitingPayment")
        : confirmation
          ? t("headline.thanks")
          : t(`status.${order.status}` as "status.PLACED");
  const d = order.delivery;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="rb-mono-s text-ink-muted">
          {order.reference}
          {order.kind !== "PRODUCTS" ? <span className="ml-2 font-sans">· {t(`kind.${order.kind}`)}</span> : null}
        </p>
        <h1 className="rb-headline mt-1 text-[28px] sm:text-[36px]">{headline}</h1>
        {order.status !== "CANCELLED" ? <p className="mt-2 text-ink">{t("arrives", { from: day(order.promise.from), to: day(order.promise.to) })}</p> : null}
        {order.status === "CANCELLED" && order.cancelReason ? <p className="mt-2 text-ink-muted">{order.cancelReason}</p> : null}
      </div>

      {order.status === "PENDING_PAYMENT" && payment ? (
        <div className={box}>
          {order.paymentMethod === "BANK_TRANSFER" ? (
            <>
              <p className="font-medium">{t("transfer.title", { total: money(order.totals.totalMinor) })}</p>
              <p className="mt-2 whitespace-pre-line text-sm">{payment.instructions}</p>
              <p className="mt-2 text-sm text-ink-muted">{t("transfer.reference", { reference: order.reference })}</p>
            </>
          ) : (
            <>
              <p className="text-sm">{payment.status === "FAILED" ? t("payment.failed") : t("payment.waiting")}</p>
              {order.canPay ? (
                <button type="button" disabled={busy} onClick={pay} className="mt-3 rounded-[var(--radius-s)] bg-ink px-5 py-3 font-medium text-ink-inverse disabled:opacity-60">
                  {t("payment.pay", { total: money(order.totals.totalMinor - byGiftCard) })}
                </button>
              ) : null}
            </>
          )}
          {payment.expiresAt ? <p className="mt-3 text-xs text-ink-muted">{t("holdUntil", { when: new Date(payment.expiresAt).toLocaleString(locale === "en" ? "en-GB" : "fr-FR", { dateStyle: "medium", timeStyle: "short" }) })}</p> : null}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className={box} aria-labelledby="lines-title">
          <h2 id="lines-title" className="rb-title mb-3">
            {t("items")}
          </h2>
          <ul className="divide-y divide-line">
            {order.lines.map((l) => (
              <li key={l.id} className="flex justify-between gap-4 py-3 text-sm">
                <span>
                  {l.title} × {l.quantity}
                  <br />
                  <span className="rb-mono-s text-ink-muted">{l.sku}</span>
                </span>
                <span className="rb-numeral shrink-0">{money(l.breakdown.itemMinor)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-3 space-y-1 border-t border-line pt-3 text-sm">
            {(
              [
                ["shipping", order.totals.shippingMinor],
                ["duties", order.totals.dutiesMinor],
                ["taxes", order.totals.taxesMinor],
                ["fees", order.totals.feesMinor],
                ["discount", -(order.totals.discountMinor ?? order.discountMinor ?? 0)],
              ] as const
            )
              .filter(([k, v]) => (k === "discount" ? v < 0 : v > 0 || k === "shipping"))
              .map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <dt className="text-ink-muted">{t(`totals.${k}`)}</dt>
                  <dd className="rb-numeral">{money(v)}</dd>
                </div>
              ))}
            <div className="flex justify-between border-t border-line pt-2 text-base font-semibold">
              <dt>{t("totals.total")}</dt>
              <dd className="rb-numeral">{money(order.totals.totalMinor)}</dd>
            </div>
          </dl>
        </section>

        <aside className="flex flex-col gap-4">
          <div className={box}>
            <h2 className="rb-label mb-2">{order.deliveryMethod === "PICKUP" ? t("pickupPoint") : t("deliverTo")}</h2>
            <p className="text-sm">
              {d.pickupPoint ? (
                <>
                  {d.pickupPoint.name}
                  <br />
                  {d.pickupPoint.addressLine}, {d.pickupPoint.city}
                </>
              ) : (
                <>
                  {d.recipientName ?? d.contactName} · {d.phone}
                  <br />
                  {[d.street, d.addressLine, d.district, d.city].filter(Boolean).join(", ")}
                  <br />
                  <span className="text-ink-muted">{d.landmark}</span>
                </>
              )}
            </p>
          </div>
          <OrderShipments shipments={order.shipments ?? []} boxClass={box} />
          <OrderReturns key={`${order.refunds?.length ?? 0}-${(order.returnOptions ?? []).reduce((n, o) => n + o.quantity, 0)}`} order={order} onChanged={load} boxClass={box} />
          {order.timeline.length > 1 ? (
            <div className={box}>
              <h2 className="rb-label mb-2">{t("progress")}</h2>
              <ol className="grid gap-1.5 text-sm">
                {order.timeline.map((s, i) => (
                  <li key={i} className="flex justify-between gap-3">
                    <span>{t(`status.${s.status}` as "status.PLACED")}</span>
                    <span className="text-ink-muted">{format.dateTime(s.at)}</span>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}
          <div className={box}>
            <h2 className="rb-label mb-2">{t("paymentTitle")}</h2>
            <p className="text-sm">{t(`methods.${order.paymentMethod}`)}</p>
            {byGiftCard && order.paymentMethod !== "GIFT_CARD" ? <p className="mt-1 text-sm text-ink-muted">{t("giftCardPart", { amount: money(byGiftCard) })}</p> : null}
            {order.paymentMethod === "NET_30" && payment?.status === "PENDING" && payment.expiresAt ? (
              <p className="mt-2 text-sm text-ink-muted">{t("net30Due", { when: format.shortDate(payment.expiresAt) })}</p>
            ) : null}
            {order.invoice ? (
              <a href={`/api/tracecart/me/orders/${order.reference}/invoice`} className="mt-3 inline-block text-sm font-medium text-ink underline">
                {t("invoice", { number: order.invoice.number })}
              </a>
            ) : null}
          </div>
          {order.canCancel ? (
            <button type="button" disabled={busy} onClick={cancel} className="self-start text-sm text-ink-muted underline">
              {t("cancel")}
            </button>
          ) : null}
          <Link href="/account/orders" className="text-sm font-medium text-ink underline">
            {t("allOrders")}
          </Link>
        </aside>
      </div>
    </div>
  );
}
