"use client";

import { FormEvent, useState } from "react";
import { api } from "@/lib/apiClient";
import Button from "@/components/ui/button/Button";
import { OrderPhotoUploader } from "./OrderPhotoUploader";
import { Order, VolumeTier, VOLUME_TIER_LABELS } from "@/lib/types";

const inputClasses =
  "h-11 w-full rounded-[var(--radius-s)] border border-line-strong bg-surface-raised px-4 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:outline-2 focus:outline-offset-2 focus:outline-focus-ring";

/**
 * Second intake path: the customer already bought the goods themselves —
 * TraceCart only transports. No product URL to resolve, no purchase for
 * TraceCart to make; just what it is, where it's going, and photos of the
 * physical item. Mirrors IntentForm's shape (same Field/inputClasses) minus
 * the product-URL/"Détecter" step.
 */
export function CustomerOwnedIntentForm({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }) {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [destinationCity, setDestinationCity] = useState("");
  const [destinationCountry, setDestinationCountry] = useState("");
  const [productName, setProductName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [volumeTier, setVolumeTier] = useState<VolumeTier>("SMALL_UNITS");
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const order = await api.post<Order>("/orders", {
        intakeType: "CUSTOMER_OWNED",
        customerName,
        customerPhone,
        customerEmail: customerEmail || undefined,
        destinationCity,
        destinationCountry,
        productName,
        quantity: quantity ? Number(quantity) : undefined,
        volumeTier,
        notes: notes || undefined,
      });
      setCreatedOrder(order);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de créer la demande de transport");
    } finally {
      setSubmitting(false);
    }
  }

  async function refreshCreatedOrder() {
    if (!createdOrder) return;
    const fresh = await api.get<Order>(`/orders/${createdOrder.id}`);
    setCreatedOrder(fresh);
  }

  if (createdOrder) {
    return (
      <div className="rounded-tl-[var(--radius-l)] rounded-tr-[var(--radius-xs)] rounded-br-[var(--radius-xs)] rounded-bl-[var(--radius-xs)] border border-line bg-surface-raised p-5">
        <h2 className="rb-title-l text-[20px]">Photos de l&apos;article</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Ajoutez des photos de {createdOrder.productName} avant de terminer — le partenaire logistique s&apos;en sert
          pour préparer sa cotation.
        </p>
        <div className="mt-4">
          <OrderPhotoUploader order={createdOrder} onChanged={refreshCreatedOrder} />
        </div>
        <div className="mt-5 flex justify-end">
          <Button onClick={onCreated}>Terminer</Button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-tl-[var(--radius-l)] rounded-tr-[var(--radius-xs)] rounded-br-[var(--radius-xs)] rounded-bl-[var(--radius-xs)] border border-line bg-surface-raised p-5"
    >
      <h2 className="rb-title-l text-[20px]">Transport d&apos;un article déjà acheté</h2>
      <p className="mt-1 text-sm text-ink-muted">
        Le client a déjà acheté cet article — TraceCart s&apos;occupe uniquement du transport. Renseignez le client, la
        destination et ce qui doit être transporté ; vous ajouterez des photos à l&apos;étape suivante.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="Nom du client">
          <input required value={customerName} onChange={(e) => setCustomerName(e.target.value)} className={inputClasses} />
        </Field>
        <Field label="Téléphone du client">
          <input
            required
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            placeholder="+227..."
            className={inputClasses}
          />
        </Field>
        <Field label="Email du client (optionnel)">
          <input
            type="email"
            value={customerEmail}
            onChange={(e) => setCustomerEmail(e.target.value)}
            className={inputClasses}
          />
        </Field>
        <Field label="Quantité">
          <input
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className={inputClasses}
          />
        </Field>
        <Field label="Ville de destination">
          <input required value={destinationCity} onChange={(e) => setDestinationCity(e.target.value)} className={inputClasses} />
        </Field>
        <Field label="Pays de destination">
          <input
            required
            value={destinationCountry}
            onChange={(e) => setDestinationCountry(e.target.value)}
            className={inputClasses}
          />
        </Field>
        <Field label="Volume estimé" className="sm:col-span-2">
          <select value={volumeTier} onChange={(e) => setVolumeTier(e.target.value as VolumeTier)} className={inputClasses}>
            {(Object.keys(VOLUME_TIER_LABELS) as VolumeTier[]).map((tier) => (
              <option key={tier} value={tier}>
                {VOLUME_TIER_LABELS[tier]}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="mt-4">
        <Field label="Ce qui doit être transporté">
          <input
            required
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            placeholder="Ex: Samsung Galaxy A17 5G"
            className={inputClasses}
          />
        </Field>
      </div>

      <div className="mt-4">
        <Field label="Notes internes">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full rounded-[var(--radius-s)] border border-line-strong bg-surface-raised px-4 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:outline-2 focus:outline-offset-2 focus:outline-focus-ring"
          />
        </Field>
      </div>

      {error && <p className="mt-4 rounded-[var(--radius-s)] bg-critical-soft px-3 py-2 text-sm text-critical">{error}</p>}

      <div className="mt-5 flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" loading={submitting}>
          Continuer
        </Button>
      </div>
    </form>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block text-sm ${className ?? ""}`}>
      <span className="rb-label mb-1 block text-ink">{label}</span>
      {children}
    </label>
  );
}
