"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { api } from "@/lib/apiClient";
import Button from "@/components/ui/button/Button";
import { LogisticsQuoteForm } from "./LogisticsQuoteForm";
import { OrderPhotoUploader } from "./OrderPhotoUploader";
import { Order } from "@/lib/types";
import { useFormat } from "@/lib/format";

const inputBase =
  "h-10 rounded-[var(--radius-s)] border border-line-strong bg-surface-raised px-3 text-sm text-ink placeholder:text-ink-muted focus:outline-2 focus:outline-offset-2 focus:outline-focus-ring";
const inputClasses = `${inputBase} w-full`;

export function QuotingDesk({ order, onChanged }: { order: Order; onChanged: () => void }) {
  const t = useTranslations("orders");
  const f = useFormat();
  const [productCost, setProductCost] = useState(order.productCost ?? "");
  const [currency, setCurrency] = useState(order.currency ?? order.hub.currency);
  const [platformFee, setPlatformFee] = useState(order.platformFee ?? "");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(action: string, fn: () => Promise<unknown>) {
    setBusy(action);
    setError(null);
    try {
      await fn();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("actionFailed"));
    } finally {
      setBusy(null);
    }
  }

  const isCustomerOwned = order.intakeType === "CUSTOMER_OWNED";
  const quote = order.logisticsQuote;
  // The total it would be sent at, line by line, is the "Customer quote" card (QuoteBreakdown).

  return (
    <div className="space-y-4">
      {isCustomerOwned && (
        <div>
          <p className="rb-overline mb-1.5">{t("desk.photos")}</p>
          <OrderPhotoUploader order={order} onChanged={onChanged} />
        </div>
      )}

      <div>
        <p className="rb-overline mb-1.5">{t(isCustomerOwned ? "desk.quote" : "desk.carrierQuote")}</p>
        {quote ? (
          <div className="rounded-[var(--radius-s)] bg-surface-sunken p-3 text-sm">
            <div className="flex justify-between font-medium text-ink">
              <span>{t("quote.total")}</span>
              <span>{f.money(quote.amount, quote.currency)}</span>
            </div>
            <ul className="mt-1.5 space-y-0.5 text-xs text-ink-muted">
              {quote.lineItems.map((li, i) => (
                <li key={i} className="flex justify-between">
                  <span>{li.label}</span>
                  <span>{f.number(li.amount)}</span>
                </li>
              ))}
            </ul>
            {quote.note && <p className="mt-1.5 text-xs italic text-ink-muted">{quote.note}</p>}
          </div>
        ) : (
          <p className="text-sm text-ink-muted">{t(isCustomerOwned ? "desk.waiting" : "desk.waitingCarrier")}</p>
        )}
      </div>

      {isCustomerOwned && (order.status === "QUOTING" || order.status === "QUOTED") && (
        <div className="border-t border-line pt-3">
          <p className="rb-overline mb-1.5">{quote ? t("desk.revise") : t("desk.propose")}</p>
          <LogisticsQuoteForm order={order} onChanged={onChanged} />
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {!isCustomerOwned && (
          <label className="block text-sm">
            <span className="rb-label mb-1 block text-ink">{t("desk.productCost")}</span>
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                value={productCost}
                onChange={(e) => setProductCost(e.target.value)}
                className={`${inputBase} min-w-0 flex-1`}
              />
              <input
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                aria-label={t("desk.currency")}
                className={`${inputBase} w-20 flex-shrink-0`}
              />
            </div>
          </label>
        )}
        <label className="block text-sm">
          <span className="rb-label mb-1 block text-ink">
            {t(isCustomerOwned ? "desk.feeOptional" : "desk.feeDefault")}
          </span>
          <input
            type="number"
            min="0"
            value={platformFee}
            onChange={(e) => setPlatformFee(e.target.value)}
            placeholder={t("desk.feePlaceholder")}
            className={inputClasses}
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        {!isCustomerOwned && (
          <Button
            variant="secondary"
            size="s"
            disabled={!productCost}
            loading={busy === "cost"}
            onClick={() =>
              run("cost", () => api.patch(`/orders/${order.id}`, { productCost: Number(productCost), currency }))
            }
          >
            {t("desk.saveCost")}
          </Button>
        )}
        <Button
          variant="secondary"
          size="s"
          disabled={!platformFee}
          loading={busy === "fee"}
          onClick={() => run("fee", () => api.post(`/orders/${order.id}/fee`, { platformFee: Number(platformFee) }))}
        >
          {t("desk.saveFee")}
        </Button>
      </div>

      {order.status === "QUOTED" && (
        <Button
          block
          disabled={(!isCustomerOwned && !order.productCost) || !quote}
          loading={busy === "send"}
          onClick={() => run("send", () => api.post(`/orders/${order.id}/send-quote`))}
        >
          {t("desk.sendQuote")}
        </Button>
      )}

      {order.status === "QUOTE_SENT" && (
        <div className="space-y-2">
          <div className="rounded-[var(--radius-s)] bg-surface-sunken p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-ink-muted">{t("desk.quoteSent")}</span>
              <span className="font-semibold tabular-nums text-ink">
                {order.customerQuoteTotal != null && f.money(order.customerQuoteTotal, order.currency ?? order.hub.currency)}
              </span>
            </div>
            {order.quoteAcceptedAt ? (
              <p className="mt-1 text-xs font-medium text-positive">
                {t("desk.acceptedOn", { when: f.dateTime(order.quoteAcceptedAt) })}
              </p>
            ) : (
              <p className="mt-1 text-xs text-ink-muted">{t("desk.waitingCustomer")}</p>
            )}
            <p className="mt-1 text-xs text-ink-muted">
              {t("desk.paymentStatus", { status: t(order.paymentStatus === "PAID" ? "desk.paid" : "desk.pending") })}
            </p>
          </div>
          <Button block loading={busy === "paid"} onClick={() => run("paid", () => api.post(`/orders/${order.id}/mark-paid`))}>
            {t("desk.markPaid")}
          </Button>
        </div>
      )}

      {error && <p className="text-xs text-critical">{error}</p>}
    </div>
  );
}
