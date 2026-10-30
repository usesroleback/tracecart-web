"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { addToCart, CartError } from "@/lib/cart";

/** Quantity and "Add to cart" for one offer of one version (signed in or not). */
export function AddToCart({ sku, offerId, max, secondary = false }: { sku: string; offerId?: string; max: number | null; secondary?: boolean }) {
  const t = useTranslations("checkout.cart");
  const [quantity, setQuantity] = useState(1);
  const [state, setState] = useState<"idle" | "adding" | "added">("idle");
  const [error, setError] = useState<string | null>(null);
  const limit = Math.max(1, Math.min(max ?? 99, 99));

  async function add() {
    setState("adding");
    setError(null);
    try {
      await addToCart(sku, quantity, offerId);
      setState("added");
    } catch (e) {
      setError(e instanceof CartError && e.code === "OUT_OF_STOCK" ? t("outOfStock") : e instanceof CartError && e.code === "NOT_FOUND" ? t("unavailable") : (e as Error).message);
      setState("idle");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {!secondary ? (
          <label className="flex items-center gap-2 text-sm text-ink-muted">
            {t("quantity")}
            <select
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="h-11 rounded-[var(--radius-s)] border border-line-strong bg-surface-raised px-2 text-ink"
            >
              {Array.from({ length: limit }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <button
          type="button"
          onClick={add}
          disabled={state === "adding"}
          className={
            secondary
              ? "inline-flex h-9 items-center rounded-[var(--radius-s)] border border-ink px-3 text-sm font-medium text-ink hover:bg-ink hover:text-ink-inverse disabled:opacity-60"
              : "inline-flex h-11 flex-1 items-center justify-center rounded-[var(--radius-s)] bg-ink px-5 font-medium text-ink-inverse hover:opacity-90 disabled:opacity-60 sm:flex-none"
          }
        >
          {state === "adding" ? t("adding") : t("add")}
        </button>
      </div>
      <p role="status" aria-live="polite" className="text-sm">
        {state === "added" ? (
          <>
            <span className="text-positive">{t("added")}</span>{" "}
            <Link href="/cart" className="font-medium text-ink underline">
              {t("view")}
            </Link>
          </>
        ) : null}
        {error ? <span className="text-critical">{error}</span> : null}
      </p>
    </div>
  );
}
