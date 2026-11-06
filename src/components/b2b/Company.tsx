"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import Button from "@/components/ui/button/Button";
import { Field, input } from "@/components/ui/form/Form";
import { box, SignInGate } from "@/components/services/SignInGate";
import { Badge } from "@/components/ui/badge/Badge";
import { call } from "@/components/checkout/http";
import { COUNTRY_CODES, countryName } from "@/lib/country";
import { toMajor } from "@/lib/currency";
import { useFormat } from "@/lib/format";

type Status = "PENDING" | "ACTIVE" | "CLOSED" | "SUSPENDED";

interface Application {
  id: string;
  status: Status;
  name: string;
  countryCode: string | null;
  city: string;
  addressLine: string;
  phone: string | null;
  taxId: string | null;
  orderLimitMinor: number;
  net30: boolean;
  taxExempt: boolean;
  documents: { id: string; fileName: string; status: "PENDING" | "APPROVED" | "REJECTED"; rejectNote: string | null }[];
  currency: string;
  decisionNote: string | null;
}

const TONE: Record<Status, "info" | "positive" | "critical" | "attn"> = { PENDING: "info", ACTIVE: "positive", CLOSED: "critical", SUSPENDED: "attn" };

/** Apply for a company account, then see where the application stands (ADR-060). */
export function ApplyForCompany() {
  const t = useTranslations("b2b");
  return (
    <SignInGate title={t("gateTitle")} lead={t("gateLead")}>
      {() => <CompanyPanel />}
    </SignInGate>
  );
}

function CompanyPanel() {
  const t = useTranslations("b2b");
  const locale = useLocale();
  const format = useFormat();
  const [application, setApplication] = useState<Application | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setApplication((await call<{ application: Application | null }>("GET", "/me/company")).application);
    setLoaded(true);
  }, []);

  useEffect(() => {
    load().catch((e) => setError((e as Error).message));
  }, [load]);

  if (!loaded) return error ? <p className="text-sm text-critical">{error}</p> : <p className="text-sm text-ink-muted">{t("loading")}</p>;

  if (!application) {
    return (
      <>
        {error ? <p className="mb-4 text-sm text-critical">{error}</p> : null}
        <CompanyForm
          busy={busy}
          onSave={async (body) => {
            setBusy(true);
            setError(null);
            try {
              setApplication((await call<{ application: Application }>("POST", "/me/company", body)).application);
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        />
      </>
    );
  }

  return (
    <div className={`${box} grid gap-3`}>
      {error ? <p className="text-sm text-critical">{error}</p> : null}
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="rb-title">{application.name}</h2>
        <Badge variant={TONE[application.status]}>{t(`statuses.${application.status}`)}</Badge>
      </div>
      <p>
        {application.addressLine}, {application.city}
        {application.countryCode ? `, ${countryName(application.countryCode, locale)}` : ""}
      </p>
      {application.status === "ACTIVE" ? (
        <>
          <p>
            {t("limit", { amount: `${format.number(toMajor(application.orderLimitMinor, application.currency))} ${application.currency}` })}
          </p>
          <p>{application.net30 ? t("net30On") : t("net30Off")}</p>
          <p>{application.taxExempt ? t("taxExemptOn") : t("taxExemptOff")}</p>
          <ul className="grid gap-2">
            {application.documents.map((d) => (
              <li key={d.id}>
                <a href={`/api/tracecart/me/company/documents/${d.id}/file`} target="_blank" rel="noreferrer" className="underline">
                  {d.fileName}
                </a>{" "}
                <span className="text-ink-muted">{t(`documentStatuses.${d.status}`)}</span>
                {d.rejectNote ? <p className="text-critical">{d.rejectNote}</p> : null}
              </li>
            ))}
          </ul>
          <label className="text-sm text-ink-muted">
            {t("uploadCertificate")}
            <input
              className={`${input} mt-1`}
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif"
              disabled={busy}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const form = new FormData();
                form.append("file", file);
                setBusy(true);
                setError(null);
                try {
                  setApplication((await call<{ application: Application }>("POST", "/me/company/documents", form)).application);
                } catch (err) {
                  setError((err as Error).message);
                } finally {
                  setBusy(false);
                  e.target.value = "";
                }
              }}
            />
          </label>
        </>
      ) : null}
      {application.decisionNote ? <p className="whitespace-pre-line">{application.decisionNote}</p> : null}
      {application.status === "ACTIVE" ? (
        <p className="flex flex-wrap gap-4">
          <Link href="/account/company/orders" className="text-sm font-medium underline">
            {t("companyOrders")}
          </Link>
          <Link href="/account/company/staff" className="text-sm font-medium underline">
            {t("colleagues")}
          </Link>
          <Link href="/account/company/cart" className="text-sm font-medium underline">
            {t("bulkOrder")}
          </Link>
          <Link href="/account/company/rfq" className="text-sm font-medium underline">
            {t("rfqLink")}
          </Link>
        </p>
      ) : null}
    </div>
  );
}

function CompanyForm({ busy, onSave }: { busy: boolean; onSave: (body: unknown) => void }) {
  const t = useTranslations("b2b");
  const locale = useLocale();
  const [form, setForm] = useState({ name: "", countryCode: "BF", city: "", addressLine: "", phone: "", taxId: "" });
  const set = (key: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: e.target.value }));
  return (
    <form
      className={`${box} grid gap-3 sm:grid-cols-2`}
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        onSave({ ...form, taxId: form.taxId.trim() || undefined });
      }}
    >
      <Field label={t("name")} required>
        <input className={input} required minLength={2} maxLength={120} value={form.name} onChange={set("name")} />
      </Field>
      <Field label={t("country")} required>
        <select className={input} required value={form.countryCode} onChange={set("countryCode")}>
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
        <input className={input} maxLength={60} value={form.taxId} onChange={set("taxId")} />
      </Field>
      <div className="sm:col-span-2">
        <Button type="submit" variant="primary" loading={busy}>
          {t("apply")}
        </Button>
      </div>
    </form>
  );
}
