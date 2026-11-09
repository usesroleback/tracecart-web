"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useAuth, useClerk } from "@clerk/nextjs";
import { Link, useRouter } from "@/i18n/navigation";
import { useFormat } from "@/lib/format";
import { toMajor } from "@/lib/currency";
import { COUNTRY_CODES, countryName } from "@/lib/country";
import { ensureCustomerAccount, StaffAccountError } from "@/lib/customer";
import { mergeGuestCart } from "@/lib/cart";
import { Field, input } from "@/components/ui/form/Form";
import { ApiError, call } from "./http";
import type { Address, PaymentMethod, PickupPoint, Quote } from "./types";

type Delivery = { method: "HOME"; addressId: string } | { method: "PICKUP"; pickupPointId: string; phone?: string };

const box = "rounded-[var(--radius-m)] border border-line bg-surface-raised p-5";

function savedCountry() {
  return document.cookie.match(/(?:^|; )tc_country=([A-Z]{2})/)?.[1] ?? "BF";
}

/**
 * Checkout: sign in (the guest cart comes along), where it goes (a saved
 * address, a new one, or a pickup point), the delivered price of every line,
 * how to pay, and the order. The total placed is the total shown.
 */
export function Checkout() {
  const t = useTranslations("checkout.checkout");
  const locale = useLocale();
  const { isLoaded, isSignedIn } = useAuth();
  const clerk = useClerk();
  const [stage, setStage] = useState<"loading" | "staff" | "ready" | "failed">("loading");
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [hasLines, setHasLines] = useState(true);

  const loadAddresses = useCallback(async () => {
    const { addresses } = await call<{ addresses: Address[] }>("GET", "/me/addresses");
    setAddresses(addresses);
    return addresses;
  }, []);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    (async () => {
      try {
        await ensureCustomerAccount();
        await mergeGuestCart();
        const cart = await call<{ lines: { savedForLater: boolean }[] }>("GET", "/me/cart");
        setHasLines(cart.lines.some((l) => !l.savedForLater));
        await loadAddresses();
        setStage("ready");
      } catch (e) {
        setStage(e instanceof StaffAccountError ? "staff" : "failed");
      }
    })();
  }, [isLoaded, isSignedIn, loadAddresses]);

  const here = typeof window === "undefined" ? `/${locale}/checkout` : window.location.href;
  if (!isLoaded) return <p className="text-ink-muted">{t("loading")}</p>;
  if (!isSignedIn) {
    return (
      <div className={`${box} mx-auto max-w-lg text-center`}>
        <h1 className="rb-headline text-[28px]">{t("signIn.title")}</h1>
        <p className="mt-2 text-sm text-ink-muted">{t("signIn.lead")}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button type="button" className="rounded-[var(--radius-s)] bg-ink px-5 py-3 font-medium text-ink-inverse" onClick={() => clerk.openSignIn({ forceRedirectUrl: here, signUpForceRedirectUrl: here })}>
            {t("signIn.signIn")}
          </button>
          <button type="button" className="rounded-[var(--radius-s)] border border-ink px-5 py-3 font-medium text-ink" onClick={() => clerk.openSignUp({ forceRedirectUrl: here, signInForceRedirectUrl: here })}>
            {t("signIn.signUp")}
          </button>
        </div>
      </div>
    );
  }
  if (stage === "loading") return <p className="text-ink-muted">{t("loading")}</p>;
  if (stage === "staff") return <p className={box}>{t("staff")}</p>;
  if (stage === "failed") return <p className="text-critical">{t("failed")}</p>;
  if (!hasLines) {
    return (
      <div className={`${box} mx-auto max-w-lg text-center`}>
        <p className="text-ink-muted">{t("emptyCart")}</p>
        <Link href="/cart" className="mt-4 inline-block font-medium text-ink underline">
          {t("backToCart")}
        </Link>
      </div>
    );
  }
  return <CheckoutForm addresses={addresses} reloadAddresses={loadAddresses} />;
}

function CheckoutForm({ addresses, reloadAddresses }: { addresses: Address[]; reloadAddresses: () => Promise<Address[]> }) {
  const t = useTranslations("checkout.checkout");
  const locale = useLocale();
  const router = useRouter();
  const format = useFormat();
  const [method, setMethod] = useState<"HOME" | "PICKUP">("HOME");
  const [addressId, setAddressId] = useState<string | null>(addresses.find((a) => a.isDefault)?.id ?? addresses[0]?.id ?? null);
  const [adding, setAdding] = useState(addresses.length === 0);
  const [pickupCountry, setPickupCountry] = useState(addresses.find((a) => a.isDefault)?.countryCode ?? "BF");
  const [points, setPoints] = useState<PickupPoint[]>([]);
  const [pointId, setPointId] = useState<string | null>(null);
  const [pickupPhone, setPickupPhone] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [payment, setPayment] = useState<PaymentMethod | null>(null);
  const [note, setNote] = useState("");
  const [couponDraft, setCouponDraft] = useState("");
  const [couponApplied, setCouponApplied] = useState<string | undefined>();
  const [giftDraft, setGiftDraft] = useState("");
  const [giftApplied, setGiftApplied] = useState<string | undefined>();
  const [placing, setPlacing] = useState(false);
  const [speed, setSpeed] = useState<"STANDARD" | "EXPRESS">("STANDARD");
  const speedNow = useRef(speed);
  const [message, setMessage] = useState<string | null>(null);
  const attempt = useRef<string | null>(null);

  const money = (minor: number, currency = quote?.currency ?? "XOF") => `${format.number(toMajor(minor, currency))} ${currency}`;
  const day = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString(locale === "en" ? "en-GB" : "fr-FR", { weekday: "short", day: "numeric", month: "short" });

  const delivery: Delivery | null = useMemo(() => {
    if (method === "HOME") return addressId ? { method, addressId } : null;
    return pointId ? { method, pickupPointId: pointId, ...(pickupPhone ? { phone: pickupPhone } : {}) } : null;
  }, [method, addressId, pointId, pickupPhone]);

  useEffect(() => {
    if (method !== "PICKUP") return;
    call<{ pickupPoints: PickupPoint[] }>("GET", `/checkout/pickup-points?country=${pickupCountry}`)
      .then((r) => {
        setPoints(r.pickupPoints);
        setPointId((current) => (r.pickupPoints.some((p) => p.id === current) ? current : (r.pickupPoints[0]?.id ?? null)));
      })
      .catch(() => setPoints([]));
  }, [method, pickupCountry]);

  const requote = useCallback(async (d: Delivery, code?: string, gift?: string) => {
    setQuoting(true);
    setMessage(null);
    try {
      const q = await call<Quote>("POST", "/checkout/quote", { delivery: d, speed: speedNow.current, ...(code ? { couponCode: code } : {}), ...(gift ? { giftCardCode: gift } : {}) });
      setQuote(q);
      setPayment((current) => (q.paymentMethods.some((m) => m.method === current && m.available) ? current : (q.paymentMethods.find((m) => m.available)?.method ?? null)));
    } catch (e) {
      setQuote(null);
      setMessage((e as Error).message);
    } finally {
      setQuoting(false);
    }
  }, []);

  useEffect(() => {
    // A new destination is a new price.
    attempt.current = null;
    // requote() sets the quote when the API answers (and clears it without a destination).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (delivery) requote(delivery, couponApplied, giftApplied);
    else setQuote(null);
  }, [delivery, couponApplied, giftApplied, requote]);

  // The gift card pays everything: no other method to choose (ADR-071).
  const paidByCard = !!quote?.giftCard?.appliedMinor && quote.amountDueMinor === 0;
  const payWith: PaymentMethod | null = paidByCard ? "GIFT_CARD" : payment;

  async function place() {
    if (!delivery || !quote || !payWith) return;
    setPlacing(true);
    setMessage(null);
    attempt.current ??= crypto.randomUUID();
    try {
      const order = await call<{ reference: string; payment: { checkoutUrl: string | null } | null }>(
        "POST",
        "/checkout/orders",
        {
          delivery,
          speed,
          paymentMethod: payWith,
          expectedTotalMinor: quote.totals.totalMinor,
          ...(note.trim() ? { note: note.trim() } : {}),
          ...(couponApplied ? { couponCode: couponApplied } : {}),
          ...(giftApplied ? { giftCardCode: giftApplied } : {}),
        },
        { "Idempotency-Key": attempt.current }
      );
      window.dispatchEvent(new CustomEvent("tc:cart", { detail: 0 }));
      if (order.payment?.checkoutUrl) window.location.href = order.payment.checkoutUrl;
      else router.push(`/checkout/done/${order.reference}`);
    } catch (e) {
      attempt.current = null;
      if (e instanceof ApiError && e.code === "PRICE_CHANGED") {
        setQuote((e.details as { quote: Quote }).quote);
        setMessage(t("priceChanged"));
      } else if (e instanceof ApiError && e.code === "OUT_OF_STOCK") {
        setMessage(t("outOfStock"));
        await requote(delivery, couponApplied, giftApplied);
      } else setMessage((e as Error).message);
      setPlacing(false);
    }
  }

  const titleOf = new Map(quote?.lines.map((l) => [l.id, l]) ?? []);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
      <div className="flex flex-col gap-6">
        <h1 className="rb-headline text-[30px] sm:text-[40px]">{t("title")}</h1>

        <section className={box} aria-labelledby="delivery-title">
          <h2 id="delivery-title" className="rb-title mb-3">
            {t("delivery")}
          </h2>
          <div className="mb-4 flex gap-2" role="radiogroup" aria-label={t("delivery")}>
            {(["HOME", "PICKUP"] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={method === m}
                onClick={() => setMethod(m)}
                className={`rounded-[var(--radius-s)] border px-4 py-2 text-sm font-medium ${method === m ? "border-ink bg-ink text-ink-inverse" : "border-line-strong text-ink"}`}
              >
                {t(`methods.${m}`)}
              </button>
            ))}
          </div>

          {method === "HOME" ? (
            <div className="flex flex-col gap-2">
              {addresses.map((a) => (
                <label key={a.id} className={`flex cursor-pointer gap-3 rounded-[var(--radius-s)] border p-3 text-sm ${addressId === a.id && !adding ? "border-ink" : "border-line"}`}>
                  <input
                    type="radio"
                    name="address"
                    checked={addressId === a.id && !adding}
                    onChange={() => {
                      setAddressId(a.id);
                      setAdding(false);
                    }}
                  />
                  <span>
                    <span className="font-medium">{a.recipientName}</span> · {a.phone}
                    <br />
                    {[a.street, a.district, a.city, countryName(a.countryCode, locale)].filter(Boolean).join(", ")}
                    <br />
                    <span className="text-ink-muted">{a.landmark}</span>
                  </span>
                </label>
              ))}
              {adding ? (
                <AddressForm
                  onSaved={async (id) => {
                    await reloadAddresses();
                    setAddressId(id);
                    setAdding(false);
                  }}
                  onCancel={addresses.length ? () => setAdding(false) : undefined}
                />
              ) : (
                <button type="button" className="self-start text-sm font-medium text-ink underline" onClick={() => setAdding(true)}>
                  {t("addAddress")}
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <Field label={t("country")} className="max-w-xs">
                <select className={input} value={pickupCountry} onChange={(e) => setPickupCountry(e.target.value)}>
                  {COUNTRY_CODES.map((c) => (
                    <option key={c} value={c}>
                      {countryName(c, locale)}
                    </option>
                  ))}
                </select>
              </Field>
              {points.length === 0 ? <p className="text-sm text-ink-muted">{t("noPickupPoints")}</p> : null}
              {points.map((p) => (
                <label key={p.id} className={`flex cursor-pointer gap-3 rounded-[var(--radius-s)] border p-3 text-sm ${pointId === p.id ? "border-ink" : "border-line"}`}>
                  <input type="radio" name="pickup" checked={pointId === p.id} onChange={() => setPointId(p.id)} />
                  <span>
                    <span className="font-medium">{p.name}</span> · {p.city}
                    <br />
                    {p.addressLine}
                    {p.landmark ? <span className="text-ink-muted"> · {p.landmark}</span> : null}
                  </span>
                </label>
              ))}
              <Field label={t("pickupPhone")} hint={t("pickupPhoneHint")} className="max-w-xs">
                <input className={input} type="tel" value={pickupPhone} onChange={(e) => setPickupPhone(e.target.value)} placeholder="+226 70 00 00 00" />
              </Field>
            </div>
          )}
        </section>

        {quote && quote.totals.dutiesMinor + quote.totals.taxesMinor > 0 ? <p className="text-sm text-ink-muted">{t("customsEstimateNote")}</p> : null}

        {quote?.speedOptions.length ? (
          <section className={box} aria-labelledby="speed-title">
            <h2 id="speed-title" className="rb-title mb-3">
              {t("speed.title")}
            </h2>
            <div className="flex flex-col gap-2" role="radiogroup" aria-labelledby="speed-title">
              {quote.speedOptions.map((o) => (
                <label key={o.speed} className={`flex cursor-pointer items-start gap-3 rounded-[var(--radius-s)] border p-3 ${speed === o.speed ? "border-ink" : "border-line"} ${o.available ? "" : "opacity-50"}`}>
                  <input
                    type="radio"
                    name="speed"
                    className="mt-1"
                    checked={speed === o.speed}
                    disabled={!o.available}
                    onChange={() => {
                      setSpeed(o.speed);
                      speedNow.current = o.speed;
                      if (delivery) void requote(delivery, couponApplied, giftApplied);
                    }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap justify-between gap-2 font-medium">
                      {t(`speed.${o.speed}`)}
                      <span className="rb-numeral">{money(o.shippingMinor)}</span>
                    </span>
                    <span className="block text-sm text-ink-muted">
                      {t(`speed.${o.speed}Hint`)}
                      {o.promise ? ` ${t("arrives", { from: day(o.promise.from), to: day(o.promise.to) })}` : ""}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </section>
        ) : null}

        {quote ? (
          <section className={box} aria-labelledby="payment-title">
            <h2 id="payment-title" className="rb-title mb-3">
              {t("payment")}
            </h2>
            {paidByCard ? <p className="text-sm">{t("paidByGiftCard")}</p> : null}
            <div className={`flex flex-col gap-2 ${paidByCard ? "hidden" : ""}`} role="radiogroup" aria-label={t("payment")}>
              {quote.paymentMethods.map((m) => (
                <label key={m.method} className={`flex gap-3 rounded-[var(--radius-s)] border p-3 text-sm ${m.available ? "cursor-pointer" : "opacity-60"} ${payment === m.method ? "border-ink" : "border-line"}`}>
                  <input type="radio" name="payment" disabled={!m.available} checked={payment === m.method} onChange={() => setPayment(m.method)} />
                  <span>
                    <span className="font-medium">{t(`paymentMethods.${m.method}`)}</span>
                    <br />
                    <span className="text-ink-muted">{m.available ? t(`paymentHints.${m.method}`) : m.blockers.map((b) => t(`blockers.${b}` as "blockers.NOT_CONFIGURED")).join(" ")}</span>
                  </span>
                </label>
              ))}
            </div>
            <Field label={t("note")} className="mt-4">
              <textarea className={`${input} h-auto min-h-[4rem] py-2`} value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} />
            </Field>
            <form
              className="mt-4 flex flex-wrap items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                setCouponApplied(couponDraft.trim() ? couponDraft.trim() : undefined);
              }}
            >
              <Field label={t("coupon")} className="min-w-[12rem] flex-1">
                <input className={input} value={couponDraft} onChange={(e) => setCouponDraft(e.target.value)} maxLength={20} autoComplete="off" />
              </Field>
              <button type="submit" className="h-10 rounded-[var(--radius-s)] border border-ink px-4 text-sm font-medium">
                {t("applyCoupon")}
              </button>
            </form>
            {quote.coupon?.error ? (
              <p role="alert" className="mt-2 text-sm text-critical">
                {t(`couponErrors.${quote.coupon.error}` as "couponErrors.NOT_FOUND")}
              </p>
            ) : null}
            <form
              className="mt-4 flex flex-wrap items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                setGiftApplied(giftDraft.trim() ? giftDraft.trim() : undefined);
              }}
            >
              <Field label={t("giftCard")} className="min-w-[12rem] flex-1">
                <input className={`${input} font-mono uppercase`} value={giftDraft} onChange={(e) => setGiftDraft(e.target.value)} maxLength={32} autoComplete="off" placeholder="XXXX-XXXX-XXXX-XXXX" />
              </Field>
              <button type="submit" className="h-10 rounded-[var(--radius-s)] border border-ink px-4 text-sm font-medium">
                {t("applyGiftCard")}
              </button>
            </form>
            {quote.giftCard?.error ? (
              <p role="alert" className="mt-2 text-sm text-critical">
                {t(`giftCardErrors.${quote.giftCard.error}` as "giftCardErrors.NOT_FOUND")}
              </p>
            ) : quote.giftCard?.appliedMinor ? (
              <p className="mt-2 text-sm text-ink-muted">{t("giftCardLeft", { last4: quote.giftCard.last4 ?? "", left: money(quote.giftCard.balanceMinor - quote.giftCard.appliedMinor) })}</p>
            ) : null}
          </section>
        ) : null}
      </div>

      <aside className={`${box} h-fit lg:sticky lg:top-28`} aria-labelledby="summary-title" aria-busy={quoting}>
        <h2 id="summary-title" className="rb-title mb-3">
          {t("summary")}
        </h2>
        {!delivery ? <p className="text-sm text-ink-muted">{t("chooseDelivery")}</p> : null}
        {quoting && !quote ? <p className="text-sm text-ink-muted">{t("pricing")}</p> : null}
        {quote ? (
          <>
            {quote.shipments.map((s, i) => (
              <div key={s.key} className="mb-3 border-b border-line pb-3 text-sm">
                <p className="rb-overline mb-1 text-ink-muted">{t(s.crossBorder ? "shipmentAbroad" : "shipmentFrom", { index: i + 1, city: s.from.city })}</p>
                <ul className="space-y-1">
                  {s.lineIds.map((id) => {
                    const l = titleOf.get(id);
                    return l ? (
                      <li key={id} className="flex justify-between gap-3">
                        <span className="min-w-0">
                          {l.title} × {l.quantity}
                        </span>
                        <span className="rb-numeral shrink-0">{money(l.unitPriceMinor * l.quantity)}</span>
                      </li>
                    ) : null;
                  })}
                </ul>
              </div>
            ))}
            <dl className="space-y-1 text-sm">
              {(
                [
                  ["items", quote.totals.itemMinor],
                  ["shipping", quote.totals.shippingMinor],
                  ["duties", quote.totals.dutiesMinor],
                  ["taxes", quote.totals.taxesMinor],
                  ["fees", quote.totals.feesMinor],
                  ["discount", -(quote.totals.discountMinor ?? 0)],
                ] as const
              )
                .filter(([k, v]) => (k === "discount" ? v < 0 : v > 0 || k === "items" || k === "shipping"))
                .map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3">
                    <dt className="text-ink-muted">{t(`totals.${k}`)}</dt>
                    <dd className="rb-numeral">{money(v)}</dd>
                  </div>
                ))}
              <div className="flex justify-between gap-3 border-t border-line pt-2 text-base font-semibold">
                <dt>{t("totals.total")}</dt>
                <dd className="rb-numeral">{money(quote.totals.totalMinor)}</dd>
              </div>
              {quote.giftCard?.appliedMinor ? (
                <>
                  <div className="flex justify-between gap-3">
                    <dt className="text-ink-muted">{t("totals.giftCard", { last4: quote.giftCard.last4 ?? "" })}</dt>
                    <dd className="rb-numeral">{money(-quote.giftCard.appliedMinor)}</dd>
                  </div>
                  <div className="flex justify-between gap-3 font-semibold">
                    <dt>{t("totals.due")}</dt>
                    <dd className="rb-numeral">{money(quote.amountDueMinor)}</dd>
                  </div>
                </>
              ) : null}
            </dl>
            <p className="mt-2 text-xs text-ink-muted">{t("allIncluded")}</p>
            {quote.promise ? <p className="mt-3 text-sm">{t("arrives", { from: day(quote.promise.from), to: day(quote.promise.to) })}</p> : null}
            {quote.problems.length ? (
              <ul className="mt-3 space-y-1 text-sm text-critical">
                {quote.problems.map((p, i) => (
                  <li key={i}>{t(`problems.${p.code}` as "problems.NO_ZONE", { sku: (p.lineId && titleOf.get(p.lineId)?.title) || "" })}</li>
                ))}
              </ul>
            ) : null}
          </>
        ) : null}
        {message ? (
          <p role="alert" className="mt-3 text-sm text-critical">
            {message}
          </p>
        ) : null}
        <button
          type="button"
          disabled={!quote?.available || !payWith || placing || quoting}
          onClick={place}
          className="mt-5 flex h-12 w-full items-center justify-center rounded-[var(--radius-s)] bg-ink font-medium text-ink-inverse hover:opacity-90 disabled:opacity-50"
        >
          {placing ? t("placing") : quote ? t("place", { total: money(quote.amountDueMinor ?? quote.totals.totalMinor) }) : t("placeNoTotal")}
        </button>
      </aside>
    </div>
  );
}

/** A new delivery address; `fixed` sets its country and city (a quote priced for one place). */
export function AddressForm({ onSaved, onCancel, fixed }: { onSaved: (id: string) => Promise<void>; onCancel?: () => void; fixed?: { countryCode: string; city: string } }) {
  const t = useTranslations("checkout.address");
  const locale = useLocale();
  const [f, setF] = useState({
    recipientName: "",
    phone: "",
    countryCode: fixed?.countryCode ?? (typeof document === "undefined" ? "BF" : savedCountry()),
    city: fixed?.city ?? "",
    district: "",
    street: "",
    landmark: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }));

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const a = await call<{ id: string }>("POST", "/me/addresses", { ...f, district: f.district || null, street: f.street || null });
      await onSaved(a.id);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="grid gap-3 rounded-[var(--radius-s)] border border-dashed border-line-strong p-4 sm:grid-cols-2">
      <Field label={t("recipientName")}>
        <input className={input} value={f.recipientName} onChange={set("recipientName")} required maxLength={120} autoComplete="name" />
      </Field>
      <Field label={t("phone")}>
        <input className={input} type="tel" value={f.phone} onChange={set("phone")} required placeholder="+226 70 00 00 00" autoComplete="tel" />
      </Field>
      <Field label={t("country")}>
        <select className={input} value={f.countryCode} onChange={set("countryCode")} disabled={!!fixed}>
          {COUNTRY_CODES.map((c) => (
            <option key={c} value={c}>
              {countryName(c, locale)}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t("city")}>
        <input className={input} value={f.city} onChange={set("city")} required maxLength={80} autoComplete="address-level2" readOnly={!!fixed} />
      </Field>
      <Field label={t("district")}>
        <input className={input} value={f.district} onChange={set("district")} maxLength={80} />
      </Field>
      <Field label={t("street")}>
        <input className={input} value={f.street} onChange={set("street")} maxLength={160} autoComplete="street-address" />
      </Field>
      <Field label={t("landmark")} hint={t("landmarkHint")} className="sm:col-span-2">
        <input className={input} value={f.landmark} onChange={set("landmark")} required minLength={3} maxLength={300} />
      </Field>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <button type="submit" disabled={saving} className="rounded-[var(--radius-s)] bg-ink px-4 py-2 text-sm font-medium text-ink-inverse disabled:opacity-60">
          {t("save")}
        </button>
        {onCancel ? (
          <button type="button" className="text-sm text-ink-muted underline" onClick={onCancel}>
            {t("cancel")}
          </button>
        ) : null}
        {error ? <span className="text-sm text-critical">{error}</span> : null}
      </div>
    </form>
  );
}
