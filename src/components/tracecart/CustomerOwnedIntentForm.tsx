"use client";

import { FormEvent, useState } from "react";
import { useTranslations } from "next-intl";
import { api } from "@/lib/apiClient";
import Button from "@/components/ui/button/Button";
import { OrderPhotoUploader } from "./OrderPhotoUploader";
import { Order, VolumeTier } from "@/lib/types";

const VOLUME_TIERS: VolumeTier[] = ["SMALL_UNITS", "MID_QUANTITY", "LARGE_STOCK"];

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
  const t = useTranslations("orders");
  const tl = useTranslations("labels");
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
      setError(err instanceof Error ? err.message : t("owned.failed"));
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
        <h2 className="rb-title-l text-[20px]">{t("owned.photosTitle")}</h2>
        <p className="mt-1 text-sm text-ink-muted">
          {t("owned.photosIntro", { product: createdOrder.productName })}
        </p>
        <div className="mt-4">
          <OrderPhotoUploader order={createdOrder} onChanged={refreshCreatedOrder} />
        </div>
        <div className="mt-5 flex justify-end">
          <Button onClick={onCreated}>{t("owned.finish")}</Button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-tl-[var(--radius-l)] rounded-tr-[var(--radius-xs)] rounded-br-[var(--radius-xs)] rounded-bl-[var(--radius-xs)] border border-line bg-surface-raised p-5"
    >
      <h2 className="rb-title-l text-[20px]">{t("owned.title")}</h2>
      <p className="mt-1 text-sm text-ink-muted">
        {t("owned.intro")}
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label={t("form.customerName")}>
          <input required value={customerName} onChange={(e) => setCustomerName(e.target.value)} className={inputClasses} />
        </Field>
        <Field label={t("form.customerPhone")}>
          <input
            required
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            placeholder="+227..."
            className={inputClasses}
          />
        </Field>
        <Field label={t("form.customerEmail")}>
          <input
            type="email"
            value={customerEmail}
            onChange={(e) => setCustomerEmail(e.target.value)}
            className={inputClasses}
          />
        </Field>
        <Field label={t("form.quantity")}>
          <input
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className={inputClasses}
          />
        </Field>
        <Field label={t("form.destinationCity")}>
          <input required value={destinationCity} onChange={(e) => setDestinationCity(e.target.value)} className={inputClasses} />
        </Field>
        <Field label={t("form.destinationCountry")}>
          <input
            required
            value={destinationCountry}
            onChange={(e) => setDestinationCountry(e.target.value)}
            className={inputClasses}
          />
        </Field>
        <Field label={t("form.volume")} className="sm:col-span-2">
          <select value={volumeTier} onChange={(e) => setVolumeTier(e.target.value as VolumeTier)} className={inputClasses}>
            {VOLUME_TIERS.map((tier) => (
              <option key={tier} value={tier}>
                {tl(`volumeTier.${tier}`)}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="mt-4">
        <Field label={t("owned.what")}>
          <input
            required
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            placeholder={t("owned.whatPlaceholder")}
            className={inputClasses}
          />
        </Field>
      </div>

      <div className="mt-4">
        <Field label={t("form.notes")}>
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
          {t("form.cancel")}
        </Button>
        <Button type="submit" loading={submitting}>
          {t("owned.continue")}
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
