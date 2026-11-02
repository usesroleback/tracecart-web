"use client";

import { FormEvent, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useCountry } from "@/context/CountryContext";
import { COUNTRY_CODES, countryName } from "@/lib/country";
import { updateProfile } from "@/lib/customer";
import { Field, input } from "@/components/ui/form/Form";
import { ApiError, call } from "@/components/checkout/http";
import { box, SignInGate } from "./SignInGate";

/**
 * "Find it for me" (ADR-038): what the catalogue doesn't have, described (or
 * carried over from an AI search), where it goes and how many. A sourcing
 * agent finds it and sends a quote that covers everything to the door.
 */
export function FindForMe({ searchId, initialWhat }: { searchId?: string; initialWhat?: string }) {
  const t = useTranslations("services.find");
  return (
    <SignInGate title={t("signInTitle")} lead={t("signInLead")}>
      {(profile, refresh) => <FindForm searchId={searchId} initialWhat={initialWhat} phone={profile.phone} onPhone={(phone) => updateProfile({ phone }).then(refresh)} />}
    </SignInGate>
  );
}

function FindForm({ searchId, initialWhat, phone, onPhone }: { searchId?: string; initialWhat?: string; phone: string | null; onPhone: (phone: string) => Promise<void> }) {
  const t = useTranslations("services.find");
  const locale = useLocale();
  const { country } = useCountry();
  const [what, setWhat] = useState(initialWhat ?? "");
  const [quantity, setQuantity] = useState(1);
  const [countryCode, setCountryCode] = useState(country ?? "BF");
  const [city, setCity] = useState("");
  const [tel, setTel] = useState(phone ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(e: FormEvent) {
    e.preventDefault();
    if (!what.trim() && !searchId && !file) return setError(t("needSomething"));
    setSending(true);
    setError(null);
    try {
      if (!phone || tel.trim() !== phone) await onPhone(tel.trim());
      const form = new FormData();
      form.append("what", what.trim());
      form.append("countryCode", countryCode);
      form.append("city", city.trim());
      form.append("quantity", String(quantity));
      form.append("locale", locale);
      if (searchId) form.append("searchId", searchId);
      if (file) form.append(file.type.startsWith("video/") ? "video" : "photo", file, file.name);
      await call("POST", "/customer/requests", form);
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError || err instanceof Error ? err.message : t("failed"));
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div className={`${box} max-w-xl`}>
        <h2 className="rb-title">{t("sentTitle")}</h2>
        <p className="mt-2 text-sm text-ink-muted">{t("sentLead")}</p>
        <Link href="/account" className="mt-4 inline-flex rounded-[var(--radius-s)] bg-ink px-5 py-3 text-sm font-medium text-ink-inverse">
          {t("toAccount")}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={send} className={`${box} grid max-w-2xl gap-4`}>
      {searchId ? <p className="rounded-[var(--radius-s)] bg-surface-sunken px-3 py-2 text-sm text-ink">{t("fromSearch")}</p> : null}
      <Field label={t("what")} hint={t("whatHint")}>
        <textarea value={what} onChange={(e) => setWhat(e.target.value)} rows={3} maxLength={500} className={`${input} h-auto py-2`} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label={t("quantity")} required>
          <input type="number" min={1} max={10000} required value={quantity} onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))} className={input} />
        </Field>
        <Field label={t("country")} required>
          <select value={countryCode} onChange={(e) => setCountryCode(e.target.value)} className={input}>
            {COUNTRY_CODES.map((c) => (
              <option key={c} value={c}>
                {countryName(c, locale)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("city")} required>
          <input required value={city} onChange={(e) => setCity(e.target.value)} maxLength={120} className={input} autoComplete="address-level2" />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("phone")} hint={t("phoneHint")} required>
          <input required type="tel" value={tel} onChange={(e) => setTel(e.target.value)} className={input} autoComplete="tel" />
        </Field>
        <Field label={t("file")} hint={t("fileHint")}>
          <input type="file" accept="image/png,image/jpeg,image/webp,video/mp4,video/quicktime,video/webm" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-sm" />
        </Field>
      </div>
      {error ? <p role="alert" className="text-sm text-critical">{error}</p> : null}
      <div>
        <button type="submit" disabled={sending} className="rounded-[var(--radius-s)] bg-ink px-5 py-3 font-medium text-ink-inverse disabled:opacity-60">
          {sending ? t("sending") : t("send")}
        </button>
      </div>
    </form>
  );
}
