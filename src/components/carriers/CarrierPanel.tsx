"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { Field, input } from "@/components/ui/form/Form";
import { call } from "@/components/checkout/http";
import { box, SignInGate } from "@/components/services/SignInGate";
import { COUNTRY_CODES, countryName } from "@/lib/country";

// A company's application to carry for Tracecart (ADR-081), from the first
// form to an approved carrier. The API says what can change.

export type CarrierStatus = "DRAFT" | "SUBMITTED" | "NEEDS_CHANGES" | "APPROVED" | "REJECTED" | "SUSPENDED";
export const CARRIER_TONE: Record<CarrierStatus, "default" | "attn" | "positive" | "critical" | "info"> = { DRAFT: "default", SUBMITTED: "info", NEEDS_CHANGES: "attn", APPROVED: "positive", REJECTED: "critical", SUSPENDED: "critical" };
export const MODES = ["ROAD", "AIR", "SEA", "RAIL", "MULTIMODAL"] as const;
export const DOCUMENT_TONE = { PENDING: "default", APPROVED: "positive", REJECTED: "critical" } as const;

export interface CarrierDocument {
  id: string;
  kind: string;
  fileName: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  rejectNote: string | null;
}

export interface CarrierApplication {
  id: string;
  status: CarrierStatus;
  name: string;
  countryCode: string | null;
  city: string;
  addressLine: string;
  phone: string | null;
  taxId: string | null;
  description: string | null;
  modes: string[];
  countries: string[];
  fleet: string | null;
  acceptingRequests: boolean;
  decisionNote: string | null;
  documents: CarrierDocument[];
  missing: string[];
  requiredDocuments: string[];
}

const card = "rounded-[var(--radius-m)] border border-line bg-surface-raised p-5 text-sm";

/** The /carry page: what's asked, then the application once signed in. */
export function CarryWithTracecart({ requiredDocuments }: { requiredDocuments: string[] | null }) {
  const t = useTranslations("carriers");
  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <section className={`${box} text-sm`} aria-labelledby="carry-how">
        <h2 id="carry-how" className="rb-title mb-2">
          {t("carry.how")}
        </h2>
        <ol className="list-inside list-decimal space-y-1">
          <li>{t("carry.step1")}</li>
          <li>{t("carry.step2")}</li>
          <li>{t("carry.step3")}</li>
        </ol>
        {requiredDocuments ? <p className="mt-3">{t("carry.documents", { documents: requiredDocuments.map((k) => t(`kinds.${k}` as "kinds.OTHER")).join(", ") })}</p> : null}
        <p className="mt-3 text-ink-muted">{t("carry.account")}</p>
      </section>
      <SignInGate title={t("carry.gateTitle")} lead={t("carry.gateLead")} otherAccount={<CarrierPanel />}>
        {() => <CarrierPanel />}
      </SignInGate>
    </div>
  );
}

export function CarrierPanel() {
  const t = useTranslations("carriers");
  const [application, setApplication] = useState<CarrierApplication | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await call<{ application: CarrierApplication | null }>("GET", "/me/carrier");
    setApplication(res.application);
    setLoaded(true);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load().catch((e) => setError((e as Error).message));
  }, [load]);

  async function act(fn: () => Promise<{ application: CarrierApplication | null }>) {
    setBusy(true);
    setError(null);
    try {
      setApplication((await fn()).application);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const alert = error ? (
    <p role="alert" className="mb-4 text-sm text-critical">
      {error}
    </p>
  ) : null;

  if (!loaded) return alert ?? <p className="text-sm text-ink-muted">{t("loading")}</p>;
  if (!application) {
    return (
      <>
        {alert}
        <DetailsForm busy={busy} onSave={(body) => act(() => call("POST", "/me/carrier", body))} />
      </>
    );
  }

  const a = application;
  const editable = a.status === "DRAFT" || a.status === "NEEDS_CHANGES";
  const live = a.status === "APPROVED";
  const upload = (form: FormData) => act(() => call("POST", "/me/carrier/documents", form));

  return (
    <div className="flex flex-col gap-4">
      {alert}
      <section className={card} aria-labelledby="carrier-status">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="carrier-status" className="rb-title">
            {a.name}
          </h2>
          <Badge variant={CARRIER_TONE[a.status]}>{t(`statuses.${a.status}`)}</Badge>
        </div>
        <p className="mt-2 text-ink-muted">{t(`explain.${a.status}`)}</p>
        {a.decisionNote ? <p className="mt-2 whitespace-pre-line font-medium">{a.decisionNote}</p> : null}
        {live ? (
          <div className="mt-3 flex flex-wrap items-center gap-4">
            <Link href="/routes" className="font-medium underline">
              {t("openRoutes")}
            </Link>
            <Link href="/partner/quotes" className="font-medium underline">
              {t("openQuotes")}
            </Link>
          </div>
        ) : null}
      </section>

      {editable || live ? <DetailsForm key={a.status} application={a} locked={live} busy={busy} onSave={(body) => act(() => call("PUT", "/me/carrier", body))} /> : null}

      <section className={card} aria-labelledby="carrier-documents">
        <h2 id="carrier-documents" className="rb-title mb-3">
          {t("documents")}
        </h2>
        <ul className="grid gap-4">
          {a.requiredDocuments.map((kind) => (
            <DocumentRow key={kind} kind={kind} required document={a.documents.find((d) => d.kind === kind)} editable={editable} busy={busy} onUpload={upload} />
          ))}
          {["INSURANCE", "VEHICLE_REGISTRATION", "OTHER"]
            .filter((k) => !a.requiredDocuments.includes(k) && (editable || a.documents.some((d) => d.kind === k)))
            .map((kind) => (
              <DocumentRow key={kind} kind={kind} document={a.documents.find((d) => d.kind === kind)} editable={editable} busy={busy} onUpload={upload} />
            ))}
        </ul>
      </section>

      {editable ? (
        <section className={card}>
          {a.missing.length ? (
            <>
              <p className="mb-2 font-medium">{t("stillNeeded")}</p>
              <ul className="mb-3 list-inside list-disc text-ink-muted">
                {a.missing.map((m) => (
                  <li key={m}>{t(`kinds.${m}` as "kinds.OTHER")}</li>
                ))}
              </ul>
            </>
          ) : null}
          <Button variant="primary" loading={busy} disabled={a.missing.length > 0} onClick={() => act(() => call("POST", "/me/carrier/submit"))}>
            {t("submit")}
          </Button>
        </section>
      ) : null}
    </div>
  );
}

function DocumentRow({ kind, document: d, required = false, editable, busy, onUpload }: { kind: string; document?: CarrierDocument; required?: boolean; editable: boolean; busy: boolean; onUpload: (form: FormData) => void }) {
  const t = useTranslations("carriers");
  const label = `${t(`kinds.${kind}` as "kinds.OTHER")}${required ? " *" : ""}`;
  return (
    <li>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{label}</span>
        {d ? <Badge variant={DOCUMENT_TONE[d.status]}>{t(`documentStatuses.${d.status}`)}</Badge> : null}
      </div>
      {d ? (
        <a href={`/api/tracecart/me/carrier/documents/${d.id}/file`} target="_blank" rel="noreferrer" className="underline">
          {d.fileName}
        </a>
      ) : null}
      {d?.rejectNote ? <p className="text-critical">{d.rejectNote}</p> : null}
      {editable ? (
        <label className="mt-1 block text-ink-muted">
          <span className="sr-only">{label}</span>
          <input
            className={input}
            type="file"
            aria-label={label}
            accept="application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const form = new FormData();
              form.append("kind", kind);
              form.append("file", file);
              onUpload(form);
              e.target.value = "";
            }}
          />
        </label>
      ) : null}
    </li>
  );
}

function DetailsForm({ application: a, locked = false, busy, onSave }: { application?: CarrierApplication; locked?: boolean; busy: boolean; onSave: (body: unknown) => void }) {
  const t = useTranslations("carriers");
  const locale = useLocale();
  const [form, setForm] = useState({
    name: a?.name ?? "",
    countryCode: a?.countryCode ?? "BF",
    city: a?.city ?? "",
    addressLine: a?.addressLine ?? "",
    phone: a?.phone ?? "",
    taxId: a?.taxId ?? "",
    description: a?.description ?? "",
    fleet: a?.fleet ?? "",
  });
  const [modes, setModes] = useState<string[]>(a?.modes ?? ["ROAD"]);
  const [countries, setCountries] = useState<string[]>(a?.countries ?? [a?.countryCode ?? "BF"]);
  const set = (key: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const toggle = (list: string[], value: string) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  return (
    <form
      className={`${card} grid gap-3 sm:grid-cols-2`}
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        onSave({ ...form, taxId: form.taxId.trim() || undefined, description: form.description.trim() || undefined, fleet: form.fleet.trim() || undefined, modes, countries });
      }}
    >
      <h2 className="rb-title sm:col-span-2">{t("details")}</h2>
      {locked ? <p className="text-ink-muted sm:col-span-2">{t("reviewedDetails")}</p> : null}
      <Field label={t("name")} required>
        <input className={input} required minLength={2} maxLength={120} disabled={locked} value={form.name} onChange={set("name")} />
      </Field>
      <Field label={t("country")} required>
        <select className={input} required disabled={locked} value={form.countryCode} onChange={set("countryCode")}>
          {COUNTRY_CODES.map((c) => (
            <option key={c} value={c}>
              {countryName(c, locale)}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t("city")} required>
        <input className={input} required minLength={2} maxLength={120} value={form.city} onChange={set("city")} />
      </Field>
      <Field label={t("address")} required>
        <input className={input} required minLength={3} maxLength={300} value={form.addressLine} onChange={set("addressLine")} />
      </Field>
      <Field label={t("phone")} required>
        <input className={input} type="tel" required minLength={6} maxLength={30} value={form.phone} onChange={set("phone")} />
      </Field>
      <Field label={t("taxId")}>
        <input className={input} maxLength={60} disabled={locked} value={form.taxId} onChange={set("taxId")} />
      </Field>
      <fieldset className="sm:col-span-2">
        <legend className="mb-1 font-medium">{t("modes")} *</legend>
        <div className="flex flex-wrap gap-3">
          {MODES.map((m) => (
            <label key={m} className="flex items-center gap-2">
              <input type="checkbox" checked={modes.includes(m)} onChange={() => setModes((x) => toggle(x, m))} />
              {t(`modeNames.${m}`)}
            </label>
          ))}
        </div>
      </fieldset>
      <Field label={t("countries")} required className="sm:col-span-2">
        <select className={`${input} h-32 py-1`} multiple required value={countries} onChange={(e) => setCountries([...e.target.selectedOptions].map((o) => o.value))}>
          {COUNTRY_CODES.map((c) => (
            <option key={c} value={c}>
              {countryName(c, locale)}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t("fleet")} className="sm:col-span-2">
        <textarea className={`${input} h-auto min-h-[4rem] py-2`} maxLength={1000} placeholder={t("fleetHint")} value={form.fleet} onChange={set("fleet")} />
      </Field>
      <Field label={t("description")} className="sm:col-span-2">
        <textarea className={`${input} h-auto min-h-[4rem] py-2`} maxLength={1000} value={form.description} onChange={set("description")} />
      </Field>
      <div className="sm:col-span-2">
        <Button type="submit" variant="secondary" loading={busy} disabled={modes.length === 0 || countries.length === 0}>
          {a ? t("saveDetails") : t("start")}
        </Button>
      </div>
    </form>
  );
}
