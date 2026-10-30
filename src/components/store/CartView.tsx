"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useFormat } from "@/lib/format";
import { toMajor } from "@/lib/currency";
import { Cart, CartLine, getCart, removeLine, updateLine } from "@/lib/cart";

/** The cart page: lines with their issues, save for later, the subtotal, and the way to checkout. */
export function CartView() {
  const t = useTranslations("checkout.cart");
  const ta = useTranslations("store.availability");
  const format = useFormat();
  const [cart, setCart] = useState<Cart | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    getCart()
      .then(setCart)
      .catch((e) => setError((e as Error).message));
  }, []);

  const money = (minor: number, currency: string) => `${format.number(toMajor(minor, currency))} ${currency}`;

  async function change(line: CartLine, fn: () => Promise<Cart>) {
    setBusy(line.id);
    setError(null);
    try {
      setCart(await fn());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  if (cart === undefined && !error) return <p className="text-ink-muted">{t("loading")}</p>;
  const buying = cart?.lines.filter((l) => !l.savedForLater) ?? [];
  const later = cart?.lines.filter((l) => l.savedForLater) ?? [];

  const row = (l: CartLine) => {
    const issue = l.issues.find((i) => i !== "PRICE_CHANGED");
    return (
      <li key={l.id} className="flex gap-4 py-4">
        <Link href={`/p/${l.productSlug}?variant=${encodeURIComponent(l.sku)}`} className="block size-20 shrink-0 overflow-hidden rounded-[var(--radius-s)] bg-surface-sunken sm:size-24">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {l.image ? <img src={l.image.url} alt={l.image.alt} className="size-full object-contain" loading="lazy" /> : null}
        </Link>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <Link href={`/p/${l.productSlug}?variant=${encodeURIComponent(l.sku)}`} className="font-medium text-ink hover:underline">
            {l.title}
          </Link>
          <p className="text-sm text-ink-muted">
            {Object.values(l.options).join(" · ")}
            {Object.keys(l.options).length ? " · " : ""}
            <span className="rb-mono-s">{l.sku}</span>
          </p>
          <p className="text-sm text-ink-muted">{l.seller ? t("soldBy", { seller: l.seller.name }) : t("soldByTracecart")}</p>
          {issue ? (
            <p className="text-sm text-critical">{t(`issues.${issue}`, { available: l.availableQuantity ?? 0 })}</p>
          ) : l.availability.kind === "ABROAD" ? (
            <p className="text-sm text-ink-muted">{ta("ABROAD")}</p>
          ) : null}
          {l.issues.includes("PRICE_CHANGED") ? <p className="text-sm text-attn">{t("priceChanged", { was: money(l.addedPriceMinor, l.unitPrice.currency) })}</p> : null}
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
            {!l.savedForLater ? (
              <label className="flex items-center gap-2 text-ink-muted">
                {t("quantity")}
                <select
                  value={l.quantity}
                  disabled={busy === l.id}
                  onChange={(e) => change(l, () => updateLine(l.id, { quantity: Number(e.target.value) }))}
                  className="h-9 rounded-[var(--radius-xs)] border border-line-strong bg-surface-raised px-2 text-ink"
                >
                  {Array.from({ length: Math.max(l.quantity, Math.min(l.availableQuantity ?? 20, 20)) }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <button type="button" disabled={busy === l.id} className="text-ink underline" onClick={() => change(l, () => updateLine(l.id, { savedForLater: !l.savedForLater }))}>
              {l.savedForLater ? t("moveToCart") : t("saveForLater")}
            </button>
            <button type="button" disabled={busy === l.id} className="text-ink-muted underline" onClick={() => change(l, () => removeLine(l.id))}>
              {t("remove")}
            </button>
          </div>
        </div>
        <p className="rb-numeral shrink-0 text-right font-semibold">{money(l.lineTotalMinor, l.unitPrice.currency)}</p>
      </li>
    );
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div>
        <h1 className="rb-headline text-[30px] sm:text-[40px]">{t("title")}</h1>
        {error ? (
          <p role="alert" className="mt-4 text-sm text-critical">
            {error}
          </p>
        ) : null}
        {buying.length ? (
          <ul className="mt-4 divide-y divide-line border-y border-line">{buying.map(row)}</ul>
        ) : (
          <div className="mt-6 rounded-[var(--radius-m)] border border-dashed border-line-strong px-6 py-10 text-center">
            <p className="text-ink-muted">{t("empty")}</p>
            <Link href="/c" className="mt-4 inline-flex rounded-[var(--radius-s)] bg-ink px-5 py-3 text-sm font-medium text-ink-inverse">
              {t("browse")}
            </Link>
          </div>
        )}
        {later.length ? (
          <section className="mt-10">
            <h2 className="rb-title-l">{t("later")}</h2>
            <ul className="mt-2 divide-y divide-line border-y border-line">{later.map(row)}</ul>
          </section>
        ) : null}
      </div>
      {cart && buying.length ? (
        <aside className="h-fit rounded-[var(--radius-m)] border border-line bg-surface-raised p-5 lg:sticky lg:top-28">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-ink-muted">{t("subtotal", { count: cart.itemCount })}</span>
            <span className="rb-numeral text-xl font-semibold">{money(cart.subtotalMinor, cart.currency)}</span>
          </div>
          <p className="mt-2 text-sm text-ink-muted">{t("deliveryAtCheckout")}</p>
          {cart.ready ? (
            <Link href="/checkout" className="mt-5 flex h-12 items-center justify-center rounded-[var(--radius-s)] bg-ink font-medium text-ink-inverse hover:opacity-90">
              {t("checkout")}
            </Link>
          ) : (
            <p className="mt-5 text-sm text-critical">{t("notReady")}</p>
          )}
        </aside>
      ) : null}
    </div>
  );
}
