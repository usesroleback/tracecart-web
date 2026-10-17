"use client";

import { FormEvent, useState } from "react";
import { api } from "@/lib/apiClient";

const inputClasses =
  "h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-400 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30";

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
      className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]"
    >
      <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">Nouvelle demande de sourcing</h2>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
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
            className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-400 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
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
            className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-400 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
          />
        </Field>
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-error-50 px-3 py-2 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
          {error}
        </p>
      )}

      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {submitting ? "Création..." : "Créer la demande"}
        </button>
      </div>
    </form>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block text-sm ${className ?? ""}`}>
      <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">{label}</span>
      {children}
    </label>
  );
}
