"use client";

import { FormEvent, ReactNode, useEffect, useState } from "react";
import { useAuth, useClerk } from "@clerk/nextjs";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import Button from "@/components/ui/button/Button";
import { Card } from "@/components/ui/card/Card";
import { api } from "@/lib/apiClient";
import { ensureCustomerAccount, StaffAccountError, updateProfile } from "@/lib/customer";
import { useFormat } from "@/lib/format";

const input =
  "h-11 w-full rounded-[var(--radius-s)] border border-line-strong bg-surface-raised px-3 text-sm text-ink placeholder:text-ink-muted focus:outline-2 focus:outline-offset-2 focus:outline-focus-ring";

type Price =
  | { priced: true; currency: string; total: number; service: number; customsDuties: number | null; customsBroker: number | null; customsIncluded: boolean; etaFrom: string; etaTo: string }
  | { priced: false; reason: "noPrice" | "noWeight" | "noRoute" };

interface Item {
  id: string;
  title: string;
  imageUrl: string | null;
  brand: string | null;
  category: string | null;
  price: Price;
}

const COUNTRY_KEY = "tracecart.shop.country";

function Field({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block text-sm ${className}`}>
      <span className="rb-label mb-1 block text-ink">{label}</span>
      {children}
    </label>
  );
}

/**
 * The catalogue as an online shop (docs/design/use-case-3-buy-from-the-catalogue.md):
 * products with one price delivered to the customer's country, customs apart.
 * Who supplies a product and how it travels stay behind the order: TraceCart
 * checks with the supplier, sends the quote and buys once it's paid.
 */
export function ShopArea() {
  const t = useTranslations("shop");
  const [countries, setCountries] = useState<string[] | null>(null);
  const [country, setCountry] = useState("");
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  // Results with the filters they were fetched for: stale ones show as loading.
  const [result, setResult] = useState<{ key: string; items: Item[] } | null>(null);
  const [open, setOpen] = useState<Item | null>(null);

  useEffect(() => {
    api.get<string[]>("/catalogue/destinations").then((list) => {
      setCountries(list);
      const saved = window.localStorage.getItem(COUNTRY_KEY);
      setCountry(saved && list.includes(saved) ? saved : (list[0] ?? ""));
    });
  }, []);

  const key = `${country}|${search}`;
  const items = result?.key === key ? result.items : null;

  useEffect(() => {
    if (!country) return;
    window.localStorage.setItem(COUNTRY_KEY, country);
    const params = new URLSearchParams({ country, ...(search ? { q: search } : {}) });
    api.get<{ items: Item[] }>(`/catalogue?${params}`).then((page) => setResult({ key: `${country}|${search}`, items: page.items }));
  }, [country, search]);

  if (countries && countries.length === 0) return <p className="text-sm text-ink-muted">{t("noDestinations")}</p>;

  return (
    <div>
      <h1 className="rb-headline text-[32px] sm:text-[40px]">{t("title")}</h1>
      <p className="mt-2 max-w-2xl text-ink-muted">{t("subtitle")}</p>

      <form
        className="mt-6 grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto] sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          setSearch(q.trim());
        }}
      >
        <Field label={t("search")}>
          <input className={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("searchPlaceholder")} />
        </Field>
        <Field label={t("deliverTo")}>
          <select className={input} value={country} onChange={(e) => setCountry(e.target.value)} disabled={!countries}>
            {(countries ?? []).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
        <Button type="submit">{t("searchButton")}</Button>
      </form>

      {open && <BuyPanel item={open} country={country} onClose={() => setOpen(null)} />}

      {!items ? (
        <p className="mt-8 text-sm text-ink-muted">{t("loading")}</p>
      ) : items.length === 0 ? (
        <p className="mt-8 text-sm text-ink-muted">
          {t("empty")}{" "}
          <Link href="/#quote" className="font-semibold text-ink underline">
            {t("askInstead")}
          </Link>
        </p>
      ) : (
        <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <li key={item.id}>
              <ProductCard item={item} onBuy={() => setOpen(item)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PriceBlock({ price }: { price: Price }) {
  const t = useTranslations("shop");
  const f = useFormat();
  if (!price.priced) return <p className="text-sm font-semibold text-ink-muted">{t("onRequest")}</p>;
  const customs = (price.customsDuties ?? 0) + (price.customsBroker ?? 0);
  return (
    <div>
      <p className="text-xl font-semibold tabular-nums">{f.money(price.total, price.currency)}</p>
      <p className="text-xs text-ink-muted">{price.customsIncluded ? t("customsIncluded", { amount: f.money(customs, price.currency) }) : t("customsExcluded")}</p>
      <p className="mt-1 text-xs text-ink-muted">{t("eta", { from: f.shortDate(price.etaFrom), to: f.shortDate(price.etaTo) })}</p>
    </div>
  );
}

function ProductCard({ item, onBuy }: { item: Item; onBuy: () => void }) {
  const t = useTranslations("shop");
  return (
    <Card padding={0} className="flex h-full flex-col overflow-hidden">
      <div className="aspect-[4/3] bg-surface-sunken">
        {item.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- store images come from many hosts
          <img src={item.imageUrl} alt="" className="h-full w-full object-contain p-4" loading="lazy" />
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          {(item.brand || item.category) && <p className="text-xs text-ink-muted">{[item.brand, item.category].filter(Boolean).join(" · ")}</p>}
          <h2 className="font-semibold leading-snug">{item.title}</h2>
        </div>
        <div className="mt-auto flex items-end justify-between gap-3">
          <PriceBlock price={item.price} />
          {item.price.priced ? (
            <Button size="s" onClick={onBuy}>
              {t("buy")}
            </Button>
          ) : (
            <Link href="/#quote" className="text-sm font-semibold underline">
              {t("ask")}
            </Link>
          )}
        </div>
      </div>
    </Card>
  );
}

/** Quantity, delivery address and the customer's account, then the order. */
function BuyPanel({ item, country, onClose }: { item: Item; country: string; onClose: () => void }) {
  const t = useTranslations("shop");
  const locale = useLocale();
  const { isLoaded, isSignedIn } = useAuth();
  const clerk = useClerk();
  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState<Price>(item.price);
  const [account, setAccount] = useState<"loading" | "staff" | "ready">("loading");
  const [phone, setPhone] = useState("");
  const [hadPhone, setHadPhone] = useState(false);
  const [v, setV] = useState({ city: "", addressLine: "", notes: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ reference: string; link: string } | null>(null);

  useEffect(() => {
    api.get<{ price: Price }>(`/catalogue/${item.id}?${new URLSearchParams({ country, quantity: String(quantity) })}`).then((res) => setPrice(res.price));
  }, [item.id, country, quantity]);

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

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (!hadPhone) await updateProfile({ phone });
      setDone(
        await api.post<{ reference: string; link: string }>(`/customer/catalogue/${item.id}/buy`, {
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

  const here = typeof window === "undefined" ? `/${locale}/shop` : window.location.href;

  return (
    <Card padding={24} className="mt-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs text-ink-muted">{t("buyingFor", { country })}</p>
          <h2 className="rb-headline text-2xl">{item.title}</h2>
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
            <div className="mt-4">
              <PriceBlock price={price} />
            </div>
            <p className="mt-3 text-xs text-ink-muted">{t("howItWorks")}</p>
          </div>

          {!isLoaded ? (
            <p className="text-sm text-ink-muted">{t("loading")}</p>
          ) : !isSignedIn ? (
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
              <Field label={t("city")}>
                <input className={input} required value={v.city} onChange={(e) => setV({ ...v, city: e.target.value })} />
              </Field>
              <Field label={t("phone")}>
                <input className={input} required value={phone} onChange={(e) => setPhone(e.target.value)} disabled={hadPhone} placeholder="+227..." />
              </Field>
              <Field label={t("address")} className="sm:col-span-2">
                <input className={input} required value={v.addressLine} onChange={(e) => setV({ ...v, addressLine: e.target.value })} />
              </Field>
              <Field label={t("notes")} className="sm:col-span-2">
                <input className={input} value={v.notes} onChange={(e) => setV({ ...v, notes: e.target.value })} />
              </Field>
              <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
                <Button type="submit" loading={busy} disabled={!price.priced}>
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
