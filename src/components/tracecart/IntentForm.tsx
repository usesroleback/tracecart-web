"use client";

import { FormEvent, useState } from "react";
import { useTranslations } from "next-intl";
import { api } from "@/lib/apiClient";
import Button from "@/components/ui/button/Button";
import { Provider, ResolveResult, VolumeTier } from "@/lib/types";

const VOLUME_TIERS: VolumeTier[] = ["SMALL_UNITS", "MID_QUANTITY", "LARGE_STOCK"];

const inputClasses =
  "h-11 w-full rounded-[var(--radius-s)] border border-line-strong bg-surface-raised px-4 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:outline-2 focus:outline-offset-2 focus:outline-focus-ring";

export interface IntentFormInitialProduct {
  url: string;
  name?: string;
  imageUrl?: string;
  provider?: Provider | null;
  reservationId?: string;
  sourcingRequestId?: string;
}

export function IntentForm({
  onCreated,
  onCancel,
  initialProduct,
}: {
  onCreated: () => void;
  onCancel: () => void;
  initialProduct?: IntentFormInitialProduct;
}) {
  const t = useTranslations("orders");
  const tl = useTranslations("labels");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [destinationCity, setDestinationCity] = useState("");
  const [destinationCountry, setDestinationCountry] = useState("");
  const [productUrl, setProductUrl] = useState(initialProduct?.url ?? "");
  const [productName, setProductName] = useState(initialProduct?.name ?? "");
  const [productImageUrl, setProductImageUrl] = useState(initialProduct?.imageUrl ?? "");
  const [quantity, setQuantity] = useState("1");
  const [volumeTier, setVolumeTier] = useState<VolumeTier>("SMALL_UNITS");
  const [notes, setNotes] = useState("");

  const [provider, setProvider] = useState<Provider | null>(initialProduct?.provider ?? null);
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleResolve() {
    if (!productUrl) return;
    setResolving(true);
    setResolveError(null);
    try {
      const result = await api.get<ResolveResult>(`/providers/resolve?url=${encodeURIComponent(productUrl)}`);
      if (result.providerSlug) {
        const providers = await api.get<Provider[]>("/providers");
        setProvider(providers.find((p) => p.slug === result.providerSlug) ?? null);
      } else {
        setProvider(null);
      }
      if (result.product.title && !productName) setProductName(result.product.title);
      if (result.product.imageUrl && !productImageUrl) setProductImageUrl(result.product.imageUrl);
    } catch {
      setResolveError(t("intent.previewFailed"));
    } finally {
      setResolving(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post("/orders", {
        customerName,
        customerPhone,
        customerEmail: customerEmail || undefined,
        destinationCity,
        destinationCountry,
        providerId: provider?.id,
        productUrl,
        productName: productName || undefined,
        productImageUrl: productImageUrl || undefined,
        quantity: quantity ? Number(quantity) : undefined,
        volumeTier,
        notes: notes || undefined,
        reservationId: initialProduct?.reservationId,
        sourcingRequestId: initialProduct?.sourcingRequestId,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("intent.failed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-tl-[var(--radius-l)] rounded-tr-[var(--radius-xs)] rounded-br-[var(--radius-xs)] rounded-bl-[var(--radius-xs)] border border-line bg-surface-raised p-5"
    >
      <h2 className="rb-title-l text-[20px]">{t("intent.title")}</h2>
      <p className="mt-1 text-sm text-ink-muted">
        {t("intent.intro")}
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
        <Field label={t("intent.productUrl")}>
          <div className="flex gap-2">
            <input
              required
              type="url"
              value={productUrl}
              onChange={(e) => setProductUrl(e.target.value)}
              onBlur={handleResolve}
              placeholder="https://www.jumia.ci/..."
              className={`flex-1 ${inputClasses}`}
            />
            <Button type="button" variant="secondary" size="m" onClick={handleResolve} disabled={resolving || !productUrl}>
              {resolving ? t("intent.detecting") : t("intent.detect")}
            </Button>
          </div>
          {provider && (
            <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium text-positive">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" /> {t("intent.storeDetected", { name: provider.name })}
            </p>
          )}
          {resolveError && <p className="mt-1.5 text-xs text-ink-muted">{resolveError}</p>}
        </Field>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-[auto,1fr]">
        {productImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={productImageUrl}
            alt=""
            className="h-20 w-20 rounded-[var(--radius-s)] border border-line object-cover"
          />
        )}
        <Field label={t("intent.productName")}>
          <input
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            placeholder={t("intent.productNamePlaceholder")}
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
          {submitting ? t("intent.creating") : t("intent.create")}
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
