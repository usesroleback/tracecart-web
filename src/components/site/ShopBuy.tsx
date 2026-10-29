"use client";

import { FormEvent, useEffect, useState } from "react";
import { useAuth, useClerk } from "@clerk/nextjs";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import Button from "@/components/ui/button/Button";
import { Card } from "@/components/ui/card/Card";
import { api } from "@/lib/apiClient";
import { countryName } from "@/lib/country";
import { ensureCustomerAccount, StaffAccountError, updateProfile } from "@/lib/customer";
import { useFormat } from "@/lib/format";
import { Field, RequiredNote } from "@/components/ui/form/Form";

const input =
  "h-11 w-full rounded-[var(--radius-s)] border border-line-strong bg-surface-raised px-3 text-sm text-ink placeholder:text-ink-muted focus:outline-2 focus:outline-offset-2 focus:outline-focus-ring";

/** A result's price delivered to the customer's country, as the API gives it (never the store's). */
export type ShopPrice =
  | { priced: true; currency: string; total: number; service: number; customsDuties: number | null; customsBroker: number | null; customsIncluded: boolean; etaFrom: string | null; etaTo: string | null }
  | { priced: false; reason: "noPrice" | "noWeight" | "noRoute" };

/** One price, everything to the customer's door, and when it would arrive; "on request" otherwise. */
export function PriceBlock({ price, compact = false }: { price: ShopPrice | null; compact?: boolean }) {
  const t = useTranslations("shop");
  const f = useFormat();
  if (!price || !price.priced) return <p className="text-sm font-semibold text-ink-muted">{t("onRequest")}</p>;
  return (
    <div>
      <p className={`${compact ? "text-base" : "text-xl"} font-semibold tabular-nums`}>{f.money(price.total, price.currency)}</p>
      <p className="text-xs text-ink-muted">{t("allIn")}</p>
      {!compact && price.etaFrom && price.etaTo && <p className="mt-1 text-xs text-ink-muted">{t("eta", { from: f.shortDate(price.etaFrom), to: f.shortDate(price.etaTo) })}</p>}
    </div>
  );
}

/**
 * Quantity and delivery address, then the order (POST /customer/shop/buy):
 * an offer a search found, priced again for the quantity. Who sells it and
 * how it travels stay behind the order: Tracecart checks with the store,
 * sends the quote, and buys once it's paid.
 */
export function BuyPanel({ title, offer, country, initialPrice, onClose }: { title: string; offer: string; country: string; initialPrice: ShopPrice; onClose: () => void }) {
  const t = useTranslations("shop");
  const locale = useLocale();
  const { isLoaded, isSignedIn } = useAuth();
  const clerk = useClerk();
  const [quantity, setQuantity] = useState(1);
  const [priced, setPriced] = useState<{ quantity: number; price: ShopPrice } | null>(null);
  const [account, setAccount] = useState<"loading" | "staff" | "ready">("loading");
  const [phone, setPhone] = useState("");
  const [hadPhone, setHadPhone] = useState(false);
  const [v, setV] = useState({ city: "", addressLine: "", notes: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ reference: string; link: string } | null>(null);
  const price = quantity === 1 ? initialPrice : priced?.quantity === quantity ? priced.price : null;

  useEffect(() => {
    if (quantity === 1) return;
    api
      .get<{ quantity: number; price: ShopPrice }>(`/shop/price?${new URLSearchParams({ offer, country, quantity: String(quantity) })}`)
      .then(setPriced, (err) => setError(err instanceof Error ? err.message : t("failed")));
  }, [offer, country, quantity, t]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    ensureCustomerAccount()
      .then((p) => {
        setPhone(p.phone ?? "");
        setHadPhone(!!p.phone);
        setAccount("ready");
      })
      .catch((err) => setAccount(err instanceof StaffAccountError ? "staff" : "ready"));
  }, [isLoaded, isSignedIn]);

  const here = typeof window === "undefined" ? `/${locale}/shop` : window.location.href;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (!hadPhone) await updateProfile({ phone });
      setDone(
        await api.post<{ reference: string; link: string }>("/customer/shop/buy", {
          offer,
          country,
          city: v.city,
          addressLine: v.addressLine,
          quantity,
          notes: v.notes.trim() || undefined,
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : t("failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card padding={24} className="mt-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs text-ink-muted">{t("buyingFor", { country: countryName(country, locale) })}</p>
          <h3 className="rb-headline text-xl">{title}</h3>
        </div>
        <Button variant="ghost" size="s" onClick={onClose}>
          {t("close")}
        </Button>
      </div>

      {done ? (
        <div className="mt-4 max-w-xl">
          <p className="font-semibold">{t("done.title", { reference: done.reference })}</p>
          <p className="mt-1 text-sm text-ink-muted">{t("done.body")}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <a href={done.link} className="text-sm font-semibold underline">
              {t("done.follow")}
            </a>
            <Link href="/account" className="text-sm font-semibold underline">
              {t("done.account")}
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-4 grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <div>
            <Field label={t("quantity")}>
              <input className={input} type="number" min={1} max={1000} value={quantity} onChange={(e) => setQuantity(Math.max(1, Math.min(1000, Number(e.target.value) || 1)))} />
            </Field>
            <div className="mt-4">{price ? <PriceBlock price={price} /> : <p className="text-sm text-ink-muted">{t("loading")}</p>}</div>
            <p className="mt-3 text-xs text-ink-muted">{t("howItWorks")}</p>
          </div>

          {isLoaded && !isSignedIn ? (
            <div>
              <p className="text-sm text-ink-muted">{t("signedOut")}</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button onClick={() => clerk.openSignUp({ forceRedirectUrl: here, signInForceRedirectUrl: here })}>{t("signUp")}</Button>
                <Button variant="secondary" onClick={() => clerk.openSignIn({ forceRedirectUrl: here, signUpForceRedirectUrl: here })}>
                  {t("signIn")}
                </Button>
              </div>
            </div>
          ) : account === "loading" ? (
            <p className="text-sm text-ink-muted">{t("loading")}</p>
          ) : account === "staff" ? (
            <p className="text-sm text-ink-muted">{t("staff")}</p>
          ) : (
            <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
              <RequiredNote className="col-span-full" />
              <Field label={t("city")}>
                <input className={input} required value={v.city} onChange={(e) => setV({ ...v, city: e.target.value })} />
              </Field>
              <Field label={t("phone")}>
                <input className={input} required value={phone} onChange={(e) => setPhone(e.target.value)} disabled={hadPhone} type="tel" />
              </Field>
              <Field label={t("address")} className="sm:col-span-2">
                <input className={input} required value={v.addressLine} onChange={(e) => setV({ ...v, addressLine: e.target.value })} />
              </Field>
              <Field label={t("notes")} className="sm:col-span-2">
                <input className={input} value={v.notes} onChange={(e) => setV({ ...v, notes: e.target.value })} />
              </Field>
              <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
                <Button type="submit" loading={busy} disabled={!price?.priced}>
                  {t("confirm")}
                </Button>
                {error && <p className="text-sm text-critical">{error}</p>}
              </div>
            </form>
          )}
        </div>
      )}
    </Card>
  );
}
