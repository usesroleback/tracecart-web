"use client";

import { FormEvent, useState } from "react";
import { useTranslations } from "next-intl";
import { api } from "@/lib/apiClient";
import Button from "@/components/ui/button/Button";

const inputClasses =
  "h-11 w-full rounded-[var(--radius-s)] border border-line-strong bg-surface-raised px-4 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:outline-2 focus:outline-offset-2 focus:outline-focus-ring";

export function SourcingRequestForm({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }) {
  const t = useTranslations("sourcing.form");
  const to = useTranslations("orders.form");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [partNumber, setPartNumber] = useState("");
  const [productUrl, setProductUrl] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [destinationCity, setDestinationCity] = useState("");
  const [destinationCountry, setDestinationCountry] = useState("");
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post("/sourcing-requests", {
        customerName,
        customerPhone,
        customerEmail: customerEmail || undefined,
        description,
        category: category || undefined,
        brand: brand || undefined,
        model: model || undefined,
        partNumber: partNumber || undefined,
        productUrl: productUrl || undefined,
        budgetMin: budgetMin ? Number(budgetMin) : undefined,
        budgetMax: budgetMax ? Number(budgetMax) : undefined,
        quantity: quantity ? Number(quantity) : undefined,
        destinationCity,
        destinationCountry,
        notes: notes || undefined,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("failed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-tl-[var(--radius-l)] rounded-tr-[var(--radius-xs)] rounded-br-[var(--radius-xs)] rounded-bl-[var(--radius-xs)] border border-line bg-surface-raised p-5"
    >
      <h2 className="rb-title-l text-[20px]">{t("title")}</h2>
      <p className="mt-1 text-sm text-ink-muted">
        {t("intro")}
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label={to("customerName")}>
          <input required value={customerName} onChange={(e) => setCustomerName(e.target.value)} className={inputClasses} />
        </Field>
        <Field label={to("customerPhone")}>
          <input
            required
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            placeholder="+227..."
            className={inputClasses}
          />
        </Field>
        <Field label={to("customerEmail")}>
          <input type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} className={inputClasses} />
        </Field>
        <Field label={to("quantity")}>
          <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} className={inputClasses} />
        </Field>
        <Field label={to("destinationCity")}>
          <input
            required
            value={destinationCity}
            onChange={(e) => setDestinationCity(e.target.value)}
            className={inputClasses}
          />
        </Field>
        <Field label={to("destinationCountry")}>
          <input
            required
            value={destinationCountry}
            onChange={(e) => setDestinationCountry(e.target.value)}
            className={inputClasses}
          />
        </Field>
      </div>

      <div className="mt-4">
        <Field label={t("what")}>
          <textarea
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder={t("whatPlaceholder")}
            className="w-full rounded-[var(--radius-s)] border border-line-strong bg-surface-raised px-4 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:outline-2 focus:outline-offset-2 focus:outline-focus-ring"
          />
        </Field>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label={t("brand")}>
          <input value={brand} onChange={(e) => setBrand(e.target.value)} className={inputClasses} />
        </Field>
        <Field label={t("model")}>
          <input value={model} onChange={(e) => setModel(e.target.value)} className={inputClasses} />
        </Field>
        <Field label={t("partNumber")}>
          <input value={partNumber} onChange={(e) => setPartNumber(e.target.value)} className={inputClasses} />
        </Field>
        <Field label={t("productUrl")}>
          <input type="url" value={productUrl} onChange={(e) => setProductUrl(e.target.value)} placeholder="https://…" className={inputClasses} />
        </Field>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Field label={t("category")}>
          <input value={category} onChange={(e) => setCategory(e.target.value)} className={inputClasses} />
        </Field>
        <Field label={t("budgetMin")}>
          <input type="number" min="0" value={budgetMin} onChange={(e) => setBudgetMin(e.target.value)} className={inputClasses} />
        </Field>
        <Field label={t("budgetMax")}>
          <input type="number" min="0" value={budgetMax} onChange={(e) => setBudgetMax(e.target.value)} className={inputClasses} />
        </Field>
      </div>

      <div className="mt-4">
        <Field label={to("notes")}>
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
          {to("cancel")}
        </Button>
        <Button type="submit" loading={submitting}>
          {submitting ? t("creating") : t("create")}
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
