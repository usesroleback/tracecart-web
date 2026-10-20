"use client";

import { FormEvent, useState } from "react";
import { api } from "@/lib/apiClient";
import Button from "@/components/ui/button/Button";

const inputClasses =
  "h-11 w-full rounded-[var(--radius-s)] border border-line-strong bg-surface-raised px-4 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:outline-2 focus:outline-offset-2 focus:outline-focus-ring";

export function SourcingRequestForm({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }) {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
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
        budgetMin: budgetMin ? Number(budgetMin) : undefined,
        budgetMax: budgetMax ? Number(budgetMax) : undefined,
        quantity: quantity ? Number(quantity) : undefined,
        destinationCity,
        destinationCountry,
        notes: notes || undefined,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de créer la demande");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-tl-[var(--radius-l)] rounded-tr-[var(--radius-xs)] rounded-br-[var(--radius-xs)] rounded-bl-[var(--radius-xs)] border border-line bg-surface-raised p-5"
    >
      <h2 className="rb-title-l text-[20px]">Nouvelle demande de sourcing</h2>
      <p className="mt-1 text-sm text-ink-muted">
        Décrivez ce que le client recherche — pas besoin d&apos;un lien produit. On cherchera des candidats dans le
        catalogue une fois la demande créée.
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
          <input type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} className={inputClasses} />
        </Field>
        <Field label="Quantité">
          <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} className={inputClasses} />
        </Field>
        <Field label="Ville de destination">
          <input
            required
            value={destinationCity}
            onChange={(e) => setDestinationCity(e.target.value)}
            className={inputClasses}
          />
        </Field>
        <Field label="Pays de destination">
          <input
            required
            value={destinationCountry}
            onChange={(e) => setDestinationCountry(e.target.value)}
            className={inputClasses}
          />
        </Field>
      </div>

      <div className="mt-4">
        <Field label="Ce que le client recherche">
          <textarea
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Ex: téléphone Samsung Galaxy, pas cher, bon état d'écran"
            className="w-full rounded-[var(--radius-s)] border border-line-strong bg-surface-raised px-4 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:outline-2 focus:outline-offset-2 focus:outline-focus-ring"
          />
        </Field>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Field label="Catégorie (optionnel)">
          <input value={category} onChange={(e) => setCategory(e.target.value)} className={inputClasses} />
        </Field>
        <Field label="Budget min (optionnel)">
          <input type="number" min="0" value={budgetMin} onChange={(e) => setBudgetMin(e.target.value)} className={inputClasses} />
        </Field>
        <Field label="Budget max (optionnel)">
          <input type="number" min="0" value={budgetMax} onChange={(e) => setBudgetMax(e.target.value)} className={inputClasses} />
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
          {submitting ? "Création..." : "Créer la demande"}
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
