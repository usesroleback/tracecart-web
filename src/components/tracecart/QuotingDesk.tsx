"use client";

import { useState } from "react";
import { api } from "@/lib/apiClient";
import Button from "@/components/ui/button/Button";
import { LogisticsQuoteForm } from "./LogisticsQuoteForm";
import { OrderPhotoUploader } from "./OrderPhotoUploader";
import { Order } from "@/lib/types";

const inputBase =
  "h-10 rounded-[var(--radius-s)] border border-line-strong bg-surface-raised px-3 text-sm text-ink placeholder:text-ink-muted focus:outline-2 focus:outline-offset-2 focus:outline-focus-ring";
const inputClasses = `${inputBase} w-full`;

export function QuotingDesk({ order, onChanged }: { order: Order; onChanged: () => void }) {
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
      setError(err instanceof Error ? err.message : "Action impossible");
    } finally {
      setBusy(null);
    }
  }

  const isCustomerOwned = order.intakeType === "CUSTOMER_OWNED";
  const quote = order.logisticsQuote;
  // CUSTOMER_OWNED has no productCost to wait on — the logistics quote alone
  // is enough to preview a total (the platform fee, if any, is a flat
  // handling charge on top rather than a percentage of a product cost).
  const total = quote
    ? isCustomerOwned
      ? Number(quote.amount) + (platformFee ? Number(platformFee) : 0)
      : productCost
        ? Number(productCost) + Number(quote.amount) + (platformFee ? Number(platformFee) : Math.round(Number(productCost) * 0.12))
        : null
    : null;

  return (
    <div className="space-y-4">
      {isCustomerOwned && (
        <div>
          <p className="sq-overline mb-1.5">Photos de l&apos;article</p>
          <OrderPhotoUploader order={order} onChanged={onChanged} />
        </div>
      )}

      <div>
        <p className="sq-overline mb-1.5">Cotation logistique{isCustomerOwned ? "" : " du partenaire"}</p>
        {quote ? (
          <div className="rounded-[var(--radius-s)] bg-surface-sunken p-3 text-sm">
            <div className="flex justify-between font-medium text-ink">
              <span>Total</span>
              <span>
                {Number(quote.amount).toLocaleString("fr-FR")} {quote.currency}
              </span>
            </div>
            <ul className="mt-1.5 space-y-0.5 text-xs text-ink-muted">
              {quote.lineItems.map((li, i) => (
                <li key={i} className="flex justify-between">
                  <span>{li.label}</span>
                  <span>{li.amount.toLocaleString("fr-FR")}</span>
                </li>
              ))}
            </ul>
            {quote.note && <p className="mt-1.5 text-xs italic text-ink-muted">{quote.note}</p>}
          </div>
        ) : (
          <p className="text-sm text-ink-muted">En attente de la cotation{isCustomerOwned ? "" : " du partenaire"}.</p>
        )}
      </div>

      {isCustomerOwned && (order.status === "QUOTING" || order.status === "QUOTED") && (
        <div className="border-t border-line pt-3">
          <p className="sq-overline mb-1.5">{quote ? "Réviser la cotation" : "Proposer une cotation"}</p>
          <LogisticsQuoteForm order={order} onChanged={onChanged} />
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {!isCustomerOwned && (
          <label className="block text-sm">
            <span className="sq-label mb-1 block text-ink">Coût produit</span>
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
                aria-label="Devise"
                className={`${inputBase} w-20 flex-shrink-0`}
              />
            </div>
          </label>
        )}
        <label className="block text-sm">
          <span className="sq-label mb-1 block text-ink">
            Frais plateforme {isCustomerOwned ? "(optionnel)" : "(défaut 12% si vide)"}
          </span>
          <input
            type="number"
            min="0"
            value={platformFee}
            onChange={(e) => setPlatformFee(e.target.value)}
            placeholder="Calculé automatiquement"
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
            Enregistrer le coût
          </Button>
        )}
        <Button
          variant="secondary"
          size="s"
          disabled={!platformFee}
          loading={busy === "fee"}
          onClick={() => run("fee", () => api.post(`/orders/${order.id}/fee`, { platformFee: Number(platformFee) }))}
        >
          Enregistrer les frais
        </Button>
      </div>

      {total != null && order.status === "QUOTED" && (
        <div className="rounded-[var(--radius-s)] bg-accent-soft p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-ink-muted">Total client estimé</span>
            <span className="font-semibold text-accent-ink">
              {total.toLocaleString("fr-FR")} {currency}
            </span>
          </div>
        </div>
      )}

      {order.status === "QUOTED" && (
        <Button
          block
          disabled={(!isCustomerOwned && !order.productCost) || !quote}
          loading={busy === "send"}
          onClick={() => run("send", () => api.post(`/orders/${order.id}/send-quote`))}
        >
          Envoyer le devis au client
        </Button>
      )}

      {order.status === "QUOTE_SENT" && (
        <div className="space-y-2">
          <div className="rounded-[var(--radius-s)] bg-accent-soft p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-ink-muted">Devis envoyé</span>
              <span className="font-semibold text-accent-ink">
                {order.customerQuoteTotal?.toLocaleString("fr-FR")} {order.currency ?? order.hub.currency}
              </span>
            </div>
            {order.quoteAcceptedAt ? (
              <p className="mt-1 text-xs font-medium text-positive">
                Accepté par le client le{" "}
                {new Date(order.quoteAcceptedAt).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}
                {" "}— paiement à confirmer
              </p>
            ) : (
              <p className="mt-1 text-xs text-ink-muted">En attente de la réponse du client</p>
            )}
            <p className="mt-1 text-xs text-ink-muted">
              Statut paiement : {order.paymentStatus === "PAID" ? "Payé" : "En attente"}
            </p>
          </div>
          <Button block loading={busy === "paid"} onClick={() => run("paid", () => api.post(`/orders/${order.id}/mark-paid`))}>
            Marquer payé
          </Button>
        </div>
      )}

      {error && <p className="text-xs text-critical">{error}</p>}
    </div>
  );
}
