"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { Field, input } from "@/components/ui/form/Form";
import { call } from "@/components/checkout/http";
import { COUNTRY_CODES, countryName } from "@/lib/country";

// A person's seller account, from the first form to a live shop (ADR-050). The
// same panel on /sell and in the Seller Center; the API says what can change.

export type SellerStatus = "DRAFT" | "SUBMITTED" | "NEEDS_CHANGES" | "APPROVED" | "REJECTED" | "SUSPENDED";
export const SELLER_TONE: Record<SellerStatus, "default" | "attn" | "positive" | "critical" | "info"> = { DRAFT: "default", SUBMITTED: "info", NEEDS_CHANGES: "attn", APPROVED: "positive", REJECTED: "critical", SUSPENDED: "critical" };

export interface SellerDocument {
  id: string;
  kind: string;
  fileName: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  rejectNote: string | null;
}

export interface Application {
  id: string;
  status: SellerStatus;
  name: string;
  countryCode: string | null;
  city: string;
  addressLine: string;
  phone: string | null;
  taxId: string | null;
  description: string | null;
  decisionNote: string | null;
  payout: { method: "MOBILE_MONEY" | "BANK"; holderName: string; provider: string; accountEnding: string; confirmed: boolean } | null;
  documents: SellerDocument[];
  missing: string[];
  agreement: { version: string; acceptedVersion: string | null; acceptedAt: string | null; current: boolean };
  terms: { commissionBps: number; payoutHoldDays: number; requiredDocuments: string[] };
}

export const percent = (bps: number) => `${bps / 100} %`;
export const DOCUMENT_TONE = { PENDING: "default", APPROVED: "positive", REJECTED: "critical" } as const;

const box = "rounded-[var(--radius-m)] border border-line bg-surface-raised p-5 text-sm";

export function SellerPanel() {
  const t = useTranslations("sellers");
  const [application, setApplication] = useState<Application | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const load = useCallback(async () => {
    const res = await call<{ application: Application | null }>("GET", "/me/seller");
    setApplication(res.application);
    setLoaded(true);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load().catch((e) => setError((e as Error).message));
  }, [load]);

  async function act(fn: () => Promise<{ application: Application | null }>) {
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
        <DetailsForm busy={busy} onSave={(body) => act(() => call("POST", "/me/seller", body))} />
      </>
    );
  }

  const a = application;
  const editable = a.status === "DRAFT" || a.status === "NEEDS_CHANGES";
  const live = a.status === "APPROVED";

  return (
    <div className="flex flex-col gap-4">
      {alert}
      <section className={box} aria-labelledby="seller-status">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="seller-status" className="rb-title">
            {a.name}
          </h2>
          <Badge variant={SELLER_TONE[a.status]}>{t(`statuses.${a.status}`)}</Badge>
        </div>
        <p className="mt-2 text-ink-muted">{t(`explain.${a.status}`)}</p>
        {a.decisionNote ? <p className="mt-2 whitespace-pre-line font-medium">{a.decisionNote}</p> : null}
        <dl className="mt-3 grid gap-1 sm:grid-cols-2">
          <div>
            <dt className="inline text-ink-muted">{t("commission")} : </dt>
            <dd className="inline">{percent(a.terms.commissionBps)}</dd>
          </div>
          <div>
            <dt className="inline text-ink-muted">{t("hold")} : </dt>
            <dd className="inline">{t("holdDays", { days: a.terms.payoutHoldDays })}</dd>
          </div>
        </dl>
      </section>

      {live && !a.agreement.current ? (
        <section className={`${box} border-attn`} role="status">
          <p className="mb-3">{t("agreementNew")}</p>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/sell/agreement" target="_blank" className="font-medium underline">
              {t("agreementLink")}
            </Link>
            <Button variant="primary" loading={busy} onClick={() => act(() => call("POST", "/me/seller/agreement", { agreementVersion: a.agreement.version }))}>
              {t("agreementAccept")}
            </Button>
          </div>
        </section>
      ) : null}

      {editable || live ? <DetailsForm key={a.status} application={a} locked={live} busy={busy} onSave={(body) => act(() => call("PUT", "/me/seller", body))} /> : null}

      <section className={box} aria-labelledby="seller-documents">
        <h2 id="seller-documents" className="rb-title mb-3">
          {t("documents")}
        </h2>
        <ul className="grid gap-4">
          {a.terms.requiredDocuments.map((kind) => (
            <DocumentRow key={kind} kind={kind} required document={a.documents.find((d) => d.kind === kind)} editable={editable} busy={busy} onUpload={(form) => act(() => call("POST", "/me/seller/documents", form))} />
          ))}
          {editable || a.documents.some((d) => !a.terms.requiredDocuments.includes(d.kind)) ? (
            <DocumentRow kind="OTHER" document={a.documents.find((d) => d.kind === "OTHER")} editable={editable} busy={busy} onUpload={(form) => act(() => call("POST", "/me/seller/documents", form))} />
          ) : null}
        </ul>
      </section>

      {editable || live ? <PayoutForm key={a.payout?.accountEnding ?? "none"} payout={a.payout} live={live} busy={busy} onSave={(body) => act(() => call("PUT", "/me/seller/payout", body))} /> : null}

      {editable ? (
        <section className={box}>
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
          <label className="mb-3 flex items-start gap-2">
            <input type="checkbox" className="mt-1" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
            <span>
              {t.rich("agreementCheck", {
                link: () => (
                  <Link href="/sell/agreement" target="_blank" className="font-medium underline">
                    {t("agreementLink")}
                  </Link>
                ),
              })}
            </span>
          </label>
          <Button variant="primary" loading={busy} disabled={a.missing.length > 0 || !agreed} onClick={() => act(() => call("POST", "/me/seller/submit", { agreementVersion: a.agreement.version }))}>
            {t("submit")}
          </Button>
        </section>
      ) : null}
      {live ? (
        <Link href="/seller" className="text-sm font-medium underline">
          {t("openCenter")}
        </Link>
      ) : null}
    </div>
  );
}

function DocumentRow({ kind, document: d, required = false, editable, busy, onUpload }: { kind: string; document?: SellerDocument; required?: boolean; editable: boolean; busy: boolean; onUpload: (form: FormData) => void }) {
  const t = useTranslations("sellers");
  const label = `${t(`kinds.${kind}` as "kinds.OTHER")}${required ? " *" : ""}`;
  return (
    <li>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{label}</span>
        {d ? <Badge variant={DOCUMENT_TONE[d.status]}>{t(`documentStatuses.${d.status}`)}</Badge> : null}
      </div>
      {d ? (
        <a href={`/api/tracecart/me/seller/documents/${d.id}/file`} target="_blank" rel="noreferrer" className="underline">
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

function DetailsForm({ application: a, locked = false, busy, onSave }: { application?: Application; locked?: boolean; busy: boolean; onSave: (body: unknown) => void }) {
  const t = useTranslations("sellers");
  const locale = useLocale();
  const [form, setForm] = useState({ name: a?.name ?? "", countryCode: a?.countryCode ?? "BF", city: a?.city ?? "", addressLine: a?.addressLine ?? "", phone: a?.phone ?? "", taxId: a?.taxId ?? "", description: a?.description ?? "" });
  const set = (key: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: e.target.value }));
  return (
    <form
      className={`${box} grid gap-3 sm:grid-cols-2`}
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        onSave({ ...form, taxId: form.taxId.trim() || undefined, description: form.description.trim() || undefined });
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
      <Field label={t("description")} className="sm:col-span-2">
        <textarea className={`${input} h-auto min-h-[4rem] py-2`} maxLength={1000} value={form.description} onChange={set("description")} />
      </Field>
      <div className="sm:col-span-2">
        <Button type="submit" variant="secondary" loading={busy}>
          {a ? t("saveDetails") : t("start")}
        </Button>
      </div>
    </form>
  );
}

function PayoutForm({ payout, live, busy, onSave }: { payout: Application["payout"]; live: boolean; busy: boolean; onSave: (body: unknown) => void }) {
  const t = useTranslations("sellers");
  const [form, setForm] = useState({ method: payout?.method ?? "MOBILE_MONEY", holderName: payout?.holderName ?? "", provider: payout?.provider ?? "", account: "" });
  const set = (key: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: e.target.value }));
  return (
    <form
      className={`${box} grid gap-3 sm:grid-cols-2`}
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        onSave(form);
      }}
    >
      <h2 className="rb-title sm:col-span-2">{t("payout")}</h2>
      {payout ? (
        <p className="sm:col-span-2">
          {t("payoutEnding", { provider: payout.provider, ending: payout.accountEnding })}
          {live && !payout.confirmed ? <span className="block text-critical">{t("payoutUnconfirmed")}</span> : null}
        </p>
      ) : null}
      {live ? <p className="text-ink-muted sm:col-span-2">{t("payoutChangeHint")}</p> : null}
      <Field label={t("payoutMethod")} required>
        <select className={input} required value={form.method} onChange={set("method")}>
          <option value="MOBILE_MONEY">{t("methods.MOBILE_MONEY")}</option>
          <option value="BANK">{t("methods.BANK")}</option>
        </select>
      </Field>
      <Field label={t("payoutProvider")} required>
        <input className={input} required minLength={2} maxLength={60} value={form.provider} onChange={set("provider")} />
      </Field>
      <Field label={t("payoutHolder")} required>
        <input className={input} required minLength={2} maxLength={120} value={form.holderName} onChange={set("holderName")} />
      </Field>
      <Field label={t("payoutAccount")} required>
        <input className={input} required minLength={4} maxLength={60} autoComplete="off" value={form.account} onChange={set("account")} />
      </Field>
      <div className="sm:col-span-2">
        <Button type="submit" variant="secondary" loading={busy}>
          {t("savePayout")}
        </Button>
      </div>
    </form>
  );
}
