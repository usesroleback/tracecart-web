"use client";

import { FormEvent, useState } from "react";
import { api } from "@/lib/apiClient";
import Button from "@/components/ui/button/Button";
import { Provider } from "@/lib/types";

const inputClasses =
  "h-11 w-full rounded-[var(--radius-s)] border border-line-strong bg-surface-raised px-4 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:outline-2 focus:outline-offset-2 focus:outline-focus-ring";

export function StoreForm({
  store,
  onSaved,
  onCancel,
}: {
  store?: Provider;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(store?.name ?? "");
  const [slug, setSlug] = useState(store?.slug ?? "");
  const [domains, setDomains] = useState(store?.domains.join(", ") ?? "");
  const [type, setType] = useState<Provider["type"]>(store?.type ?? "LOCAL_MARKETPLACE");
  const [defaultCurrency, setDefaultCurrency] = useState(store?.defaultCurrency ?? "");
  const [logoUrl, setLogoUrl] = useState(store?.logoUrl ?? "");
  const [isActive, setIsActive] = useState(store?.isActive ?? true);
  const [notes, setNotes] = useState(store?.notes ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const payload = {
        name,
        slug,
        domains: domains
          .split(",")
          .map((d) => d.trim())
          .filter(Boolean),
        type,
        defaultCurrency,
        logoUrl: logoUrl || null,
        isActive,
        notes: notes || null,
      };
      if (store) {
        await api.patch(`/providers/${store.id}`, payload);
      } else {
        await api.post("/providers", payload);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d'enregistrer la boutique");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-tl-[var(--radius-l)] rounded-tr-[var(--radius-xs)] rounded-br-[var(--radius-xs)] rounded-bl-[var(--radius-xs)] border border-line bg-surface-raised p-5"
    >
      <h2 className="rb-title-l text-[20px]">
        {store ? `Modifier ${store.name}` : "Nouvelle boutique"}
      </h2>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="Nom">
          <input required value={name} onChange={(e) => setName(e.target.value)} className={inputClasses} />
        </Field>
        <Field label="Slug">
          <input
            required
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="jumia"
            pattern="[a-z0-9-]+"
            disabled={!!store}
            className={`${inputClasses} disabled:opacity-60`}
          />
        </Field>
        <Field label="Domaines (séparés par des virgules)" className="sm:col-span-2">
          <input
            required
            value={domains}
            onChange={(e) => setDomains(e.target.value)}
            placeholder="jumia.ci, jumia.com"
            className={inputClasses}
          />
        </Field>
        <Field label="Type">
          <select
            value={type}
            onChange={(e) => setType(e.target.value as Provider["type"])}
            className={inputClasses}
          >
            <option value="LOCAL_MARKETPLACE">Marché local</option>
            <option value="INTERNATIONAL">International</option>
          </select>
        </Field>
        <Field label="Devise par défaut">
          <input
            required
            value={defaultCurrency}
            onChange={(e) => setDefaultCurrency(e.target.value)}
            placeholder="XOF"
            className={inputClasses}
          />
        </Field>
        <Field label="Logo (URL ou chemin local, ex : /images/brand/jumia.svg)" className="sm:col-span-2">
          <input
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="/images/brand/jumia.svg ou https://..."
            className={inputClasses}
          />
        </Field>
        <Field label="Notes internes" className="sm:col-span-2">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full rounded-[var(--radius-s)] border border-line-strong bg-surface-raised px-4 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:outline-2 focus:outline-offset-2 focus:outline-focus-ring"
          />
        </Field>
        <label className="flex items-center gap-2 text-sm text-ink sm:col-span-2">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          Boutique active
        </label>
      </div>

      {error && <p className="mt-4 rounded-[var(--radius-s)] bg-critical-soft px-3 py-2 text-sm text-critical">{error}</p>}

      <div className="mt-5 flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" loading={submitting}>
          {store ? "Enregistrer" : "Créer la boutique"}
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
