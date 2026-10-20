"use client";

import { FormEvent, useState } from "react";
import { useTranslations } from "next-intl";
import Button from "@/components/ui/button/Button";

const fieldClasses = "w-full bg-transparent text-sm font-medium text-ink placeholder:text-ink-muted placeholder:font-normal focus:outline-none";

function Field({ label, placeholder, value, onChange }: { label: string; placeholder: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block px-5 py-3">
      <span className="rb-overline">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`${fieldClasses} mt-1`}
      />
    </label>
  );
}

/**
 * docs/brand/tracecart-brand-guidelines.md: "From · To · What · When → Get a
 * quote. No account required; a named person replies within 4 working
 * hours." Not yet wired to a lead-capture endpoint on the backend — this is
 * the front-end only, with a client-side confirmation state.
 */
export function QuoteBar() {
  const t = useTranslations("site.quoteBar");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [what, setWhat] = useState("");
  const [when, setWhen] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!from.trim() || !to.trim() || !what.trim()) return;
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div
        id="quote"
        className="rounded-[var(--radius-m)] border border-line bg-surface-raised px-6 py-8 text-center shadow-[var(--shadow-1)]"
      >
        <p className="rb-title text-[18px]">{t("submittedTitle")}</p>
        <p className="mt-1 text-sm text-ink-muted">{t("submittedBody", { from, to })}</p>
      </div>
    );
  }

  return (
    <form
      id="quote"
      onSubmit={handleSubmit}
      className="overflow-hidden rounded-[var(--radius-m)] border border-ink shadow-[var(--shadow-1)]"
    >
      <div className="grid divide-y divide-line bg-surface-raised sm:grid-cols-[1fr_1fr_1fr_1fr_auto] sm:divide-x sm:divide-y-0">
        <Field label={t("from")} placeholder={t("fromPlaceholder")} value={from} onChange={setFrom} />
        <Field label={t("to")} placeholder={t("toPlaceholder")} value={to} onChange={setTo} />
        <Field label={t("what")} placeholder={t("whatPlaceholder")} value={what} onChange={setWhat} />
        <Field label={t("when")} placeholder={t("whenPlaceholder")} value={when} onChange={setWhen} />
        <div className="flex items-center p-3 sm:pl-0">
          <Button type="submit" block className="sm:w-auto">
            {t("cta")}
          </Button>
        </div>
      </div>
      <p className="mt-3 text-xs text-ink-muted">{t("disclaimer")}</p>
    </form>
  );
}
