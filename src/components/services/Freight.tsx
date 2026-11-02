"use client";

import { FormEvent, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useCountry } from "@/context/CountryContext";
import { COUNTRY_CODES, countryName } from "@/lib/country";
import { Field, input } from "@/components/ui/form/Form";
import { ApiError, call } from "@/components/checkout/http";
import { FreightEstimateView } from "./FreightEstimate";
import { box, SignInGate } from "./SignInGate";
import type { FreightEstimate, FreightRequestView } from "./types";

const PHOTO_TYPES = "image/png,image/jpeg,image/webp";
const VIDEO_TYPES = "video/mp4,video/quicktime,video/webm";
const MAX_PHOTOS = 6;

interface Route {
  from: { countryCode: string; city: string };
  to: { countryCode: string; city: string };
  readyOn: string;
  description: string;
  declaredValue: string;
}

/** Photos (or one video) and the route, as the API's multipart `request` and files. */
function formData(request: Record<string, unknown>, files: File[]): FormData {
  const form = new FormData();
  form.append("request", JSON.stringify(request));
  for (const f of files) form.append(f.type.startsWith("video/") ? "video" : "photos", f, f.name);
  return form;
}

const baseRequest = (r: Route) => ({
  origin: r.from,
  destination: r.to,
  description: r.description.trim(),
  ...(r.declaredValue.trim() ? { declaredValueMinor: Math.round(Number(r.declaredValue)) } : {}),
  ...(r.readyOn ? { readyOn: r.readyOn } : {}),
});

/**
 * Freight (ADR-036): where from and to, photos or a video of everything to
 * move, and an estimate at once (no account needed); then, signed in, the
 * addresses and contacts for a firm quote from an agent.
 */
export function Freight() {
  const t = useTranslations("services.freight");
  const locale = useLocale();
  const { country } = useCountry();
  const [route, setRoute] = useState<Route>({ from: { countryCode: country ?? "BF", city: "" }, to: { countryCode: country ?? "BF", city: "" }, readyOn: "", description: "", declaredValue: "" });
  const [files, setFiles] = useState<File[]>([]);
  const [estimating, setEstimating] = useState(false);
  const [result, setResult] = useState<FreightEstimate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [requesting, setRequesting] = useState(false);

  function pickFiles(list: FileList | null) {
    const picked = [...(list ?? [])];
    const video = picked.find((f) => f.type.startsWith("video/"));
    setFiles(video ? [video] : picked.filter((f) => f.type.startsWith("image/")).slice(0, MAX_PHOTOS));
    setResult(null);
  }

  async function estimate(e: FormEvent) {
    e.preventDefault();
    if (!files.length && !route.description.trim()) return setError(t("needSomething"));
    setEstimating(true);
    setError(null);
    try {
      setResult(await call<FreightEstimate>("POST", "/freight/estimate", formData(baseRequest(route), files)));
    } catch (err) {
      setError(err instanceof ApiError && err.code === "RATE_LIMITED" ? t("rateLimited") : err instanceof Error ? err.message : t("failed"));
    } finally {
      setEstimating(false);
    }
  }

  const place = (which: "from" | "to") => (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label={t(which === "from" ? "fromCountry" : "toCountry")} required>
        <select value={route[which].countryCode} onChange={(e) => setRoute({ ...route, [which]: { ...route[which], countryCode: e.target.value } })} className={input}>
          {COUNTRY_CODES.map((c) => (
            <option key={c} value={c}>
              {countryName(c, locale)}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t(which === "from" ? "fromCity" : "toCity")} required>
        <input required value={route[which].city} maxLength={120} onChange={(e) => setRoute({ ...route, [which]: { ...route[which], city: e.target.value } })} className={input} />
      </Field>
    </div>
  );

  return (
    <div className="grid gap-6">
      <form onSubmit={estimate} className={`${box} grid gap-4`}>
        <div className="grid gap-4 md:grid-cols-2">
          <fieldset className="grid gap-2">
            <legend className="rb-label mb-1">{t("from")}</legend>
            {place("from")}
          </fieldset>
          <fieldset className="grid gap-2">
            <legend className="rb-label mb-1">{t("to")}</legend>
            {place("to")}
          </fieldset>
        </div>
        <Field label={t("files")} hint={t("filesHint")}>
          <input type="file" multiple accept={`${PHOTO_TYPES},${VIDEO_TYPES}`} onChange={(e) => pickFiles(e.target.files)} className="text-sm" />
        </Field>
        {files.length ? <p className="text-xs text-ink-muted">{files.map((f) => f.name).join(", ")}</p> : null}
        <Field label={t("description")} hint={t("descriptionHint")}>
          <textarea value={route.description} maxLength={2000} rows={3} onChange={(e) => setRoute({ ...route, description: e.target.value })} className={`${input} h-auto py-2`} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("readyOn")}>
            <input type="date" value={route.readyOn} onChange={(e) => setRoute({ ...route, readyOn: e.target.value })} className={input} />
          </Field>
          <Field label={t("declaredValue")} hint={t("declaredValueHint")}>
            <input type="number" min={0} step={1} inputMode="numeric" value={route.declaredValue} onChange={(e) => setRoute({ ...route, declaredValue: e.target.value })} className={input} />
          </Field>
        </div>
        {error ? <p role="alert" className="text-sm text-critical">{error}</p> : null}
        <div>
          <button type="submit" disabled={estimating} className="rounded-[var(--radius-s)] bg-ink px-5 py-3 font-medium text-ink-inverse disabled:opacity-60">
            {estimating ? t("estimating") : t("estimate")}
          </button>
        </div>
      </form>

      {result ? (
        <section aria-live="polite" className="grid gap-4">
          <h2 className="rb-title">{t("estimateTitle")}</h2>
          <FreightEstimateView status={result.status} estimate={result.estimate} indicative={result.indicative} notGoods={result.notGoods} />
          {requesting ? (
            <SignInGate title={t("signInTitle")} lead={t("signInLead")}>
              {(profile) => <RequestForm route={route} files={files} name={profile.name} phone={profile.phone ?? ""} />}
            </SignInGate>
          ) : (
            <div>
              <button type="button" onClick={() => setRequesting(true)} className="rounded-[var(--radius-s)] bg-ink px-5 py-3 font-medium text-ink-inverse">
                {t("askQuote")}
              </button>
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}

function RequestForm({ route, files, name, phone }: { route: Route; files: File[]; name: string; phone: string }) {
  const t = useTranslations("services.freight");
  const router = useRouter();
  const blank = { addressLine: "", landmark: "", contactName: name, phone };
  const [origin, setOrigin] = useState(blank);
  const [destination, setDestination] = useState({ ...blank, contactName: "" });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(e: FormEvent) {
    e.preventDefault();
    if (!files.length) return setError(t("needFiles"));
    if (!route.description.trim()) return setError(t("needDescription"));
    setSending(true);
    setError(null);
    try {
      const request = { ...baseRequest(route), origin: { ...route.from, ...origin }, destination: { ...route.to, ...destination } };
      const created = await call<FreightRequestView>("POST", "/freight/requests", formData(request, files));
      router.push(`/account/freight/${created.reference}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("failed"));
      setSending(false);
    }
  }

  const contact = (value: typeof origin, set: (v: typeof origin) => void, title: string) => (
    <fieldset className="grid gap-3">
      <legend className="rb-label mb-1">{title}</legend>
      <Field label={t("addressLine")} required>
        <input required value={value.addressLine} maxLength={300} onChange={(e) => set({ ...value, addressLine: e.target.value })} className={input} />
      </Field>
      <Field label={t("landmark")} hint={t("landmarkHint")}>
        <input value={value.landmark} maxLength={300} onChange={(e) => set({ ...value, landmark: e.target.value })} className={input} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t("contactName")} required>
          <input required value={value.contactName} maxLength={120} onChange={(e) => set({ ...value, contactName: e.target.value })} className={input} />
        </Field>
        <Field label={t("phone")} required>
          <input required type="tel" value={value.phone} onChange={(e) => set({ ...value, phone: e.target.value })} className={input} />
        </Field>
      </div>
    </fieldset>
  );

  return (
    <form onSubmit={send} className={`${box} grid gap-5`}>
      <div className="grid gap-5 md:grid-cols-2">
        {contact(origin, setOrigin, t("collectAt", { city: route.from.city }))}
        {contact(destination, setDestination, t("deliverTo", { city: route.to.city }))}
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
