"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { Field, input } from "@/components/ui/form/Form";
import { call } from "@/components/checkout/http";
import { useListFilters } from "@/components/console/ListTools";
import { useFormat } from "@/lib/format";
import { countryName } from "@/lib/country";
import { CARRIER_TONE, CarrierApplication, CarrierStatus, DOCUMENT_TONE } from "./CarrierPanel";

// Carrier applications in the console (ADR-081). The API checks every call;
// opening a document is audited.

const STATUSES: CarrierStatus[] = ["SUBMITTED", "NEEDS_CHANGES", "APPROVED", "REJECTED", "SUSPENDED", "DRAFT"];
const LIST_FILTERS = ["q", "status"] as const;
const KINDS = ["BUSINESS_REGISTRATION", "OWNER_ID", "TRANSPORT_LICENCE", "INSURANCE", "VEHICLE_REGISTRATION", "OTHER"];
const box = "rounded-[var(--radius-m)] border border-line bg-surface-raised p-5 text-sm";

interface Row {
  id: string;
  name: string;
  email: string | null;
  countryCode: string | null;
  city: string;
  modes: string[];
  status: CarrierStatus;
  submittedAt: string | null;
}

export function CarrierApplicationsList({ canEditSettings }: { canEditSettings: boolean }) {
  const t = useTranslations("carriers");
  const format = useFormat();
  const locale = useLocale();
  const { applied, query, apply } = useListFilters(LIST_FILTERS);
  const [q, setQ] = useState(applied.q);
  const [rows, setRows] = useState<Row[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (after: string | null, filters: string) => {
    const p = new URLSearchParams(filters);
    p.set("limit", "50");
    if (after) p.set("cursor", after);
    try {
      const res = await call<{ items: Row[]; nextCursor: string | null }>("GET", `/carriers/applications?${p}`);
      setRows((prev) => (after ? [...prev, ...res.items] : res.items));
      setCursor(res.nextCursor);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQ(applied.q);
    load(null, query);
  }, [load, query, applied.q]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="rb-headline mb-1 text-[28px]">{t("admin.title")}</h1>
        <p className="text-sm text-ink-muted">{t("admin.lead")}</p>
      </div>
      <div>
        <form
          role="search"
          className="mb-4 flex flex-wrap gap-2"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            apply({ ...applied, q });
          }}
        >
          <input className={`${input} max-w-sm`} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("admin.search")} aria-label={t("admin.search")} />
          <select className={`${input} max-w-[14rem]`} aria-label={t("admin.status")} value={applied.status} onChange={(e) => apply({ ...applied, q, status: e.target.value })}>
            <option value="">{t("admin.allStatuses")}</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`statuses.${s}`)}
              </option>
            ))}
          </select>
          <Button type="submit" variant="secondary">
            {t("admin.find")}
          </Button>
        </form>
        {error ? <p className="mb-4 text-sm text-critical">{error}</p> : null}
        <div className="overflow-x-auto rounded-[var(--radius-m)] border border-line bg-surface-raised">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-ink-muted">
              <tr>
                <th className="px-4 py-3 font-medium">{t("admin.columns.carrier")}</th>
                <th className="px-4 py-3 font-medium">{t("admin.columns.status")}</th>
                <th className="px-4 py-3 font-medium">{t("admin.columns.place")}</th>
                <th className="px-4 py-3 font-medium">{t("admin.columns.modes")}</th>
                <th className="px-4 py-3 font-medium">{t("admin.columns.submitted")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-surface-sunken">
                  <td className="px-4 py-3">
                    <Link href={`/carrier-applications/${r.id}`} className="font-medium text-ink hover:underline">
                      {r.name}
                    </Link>
                    <p className="text-xs text-ink-muted">{r.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={CARRIER_TONE[r.status]}>{t(`statuses.${r.status}`)}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    {r.city}
                    {r.countryCode ? `, ${countryName(r.countryCode, locale)}` : ""}
                  </td>
                  <td className="px-4 py-3">{r.modes.map((m) => t(`modeNames.${m}` as "modeNames.ROAD")).join(", ")}</td>
                  <td className="px-4 py-3 text-ink-muted">{r.submittedAt ? format.shortDate(r.submittedAt) : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && !error ? <p className="px-4 py-8 text-center text-ink-muted">{t("admin.empty")}</p> : null}
        </div>
        {cursor ? (
          <Button variant="secondary" className="mt-4" onClick={() => load(cursor, query)}>
            {t("admin.more")}
          </Button>
        ) : null}
      </div>
      <RequiredDocuments canWrite={canEditSettings} />
    </div>
  );
}

/** What a carrier must provide: a setting (audited), not code. */
function RequiredDocuments({ canWrite }: { canWrite: boolean }) {
  const t = useTranslations("carriers");
  const [required, setRequired] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    call<{ settings: { requiredDocuments: string[] } }>("GET", "/carriers/settings").then(
      (r) => setRequired(r.settings.requiredDocuments),
      (e) => setError((e as Error).message)
    );
  }, []);

  if (!required) return error ? <p className="text-sm text-critical">{error}</p> : null;
  return (
    <form
      className={`${box} grid max-w-xl gap-3`}
      aria-labelledby="carrier-required"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        setSaved(false);
        try {
          const r = await call<{ requiredDocuments: string[] }>("PATCH", "/carriers/settings", { requiredDocuments: required });
          setRequired(r.requiredDocuments);
          setSaved(true);
        } catch (err) {
          setError((err as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2 id="carrier-required" className="rb-title">
        {t("admin.required")}
      </h2>
      <p className="text-ink-muted">{t("admin.requiredHint")}</p>
      <div className="flex flex-col gap-2">
        {KINDS.filter((k) => k !== "OTHER").map((k) => (
          <label key={k} className="flex items-center gap-2">
            <input type="checkbox" disabled={!canWrite} checked={required.includes(k)} onChange={(e) => setRequired(e.target.checked ? [...required, k] : required.filter((x) => x !== k))} />
            {t(`kinds.${k}` as "kinds.OTHER")}
          </label>
        ))}
      </div>
      {error ? <p className="text-critical">{error}</p> : null}
      {saved ? <p role="status">{t("admin.saved")}</p> : null}
      {canWrite ? (
        <Button type="submit" variant="secondary" loading={busy} disabled={required.length === 0} className="justify-self-start">
          {t("admin.saveRequired")}
        </Button>
      ) : null}
    </form>
  );
}

type Detail = CarrierApplication & { email: string | null; owner: { name: string; email: string } | null; routes: number; ready: boolean };

export function CarrierApplicationDetail({ id, ownEmail }: { id: string; ownEmail: string }) {
  const t = useTranslations("carriers");
  const locale = useLocale();
  const [c, setC] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");

  useEffect(() => {
    call<Detail>("GET", `/carriers/applications/${id}`).then(setC, (e) => setError((e as Error).message));
  }, [id]);

  async function post(path: string, body?: unknown) {
    setBusy(true);
    setError(null);
    try {
      setC(await call<Detail>("POST", `/carriers/applications/${id}/${path}`, body));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!c) return error ? <p className="text-sm text-critical">{error}</p> : <p className="text-sm text-ink-muted">{t("loading")}</p>;
  const reviewing = c.status === "SUBMITTED";

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link href="/carrier-applications" className="text-sm text-ink-muted hover:text-ink">
          {t("admin.title")}
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="rb-headline text-[28px]">{c.name}</h1>
          <Badge variant={CARRIER_TONE[c.status]}>{t(`statuses.${c.status}`)}</Badge>
        </div>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-critical">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-4">
          <section className={box}>
            <h2 className="rb-title mb-3">{t("details")}</h2>
            <p>
              {c.owner?.name} · {c.owner?.email ?? c.email}
            </p>
            <p>
              {c.phone}
              {c.taxId ? ` · ${c.taxId}` : ""}
            </p>
            <p>{[c.addressLine, c.city, c.countryCode ? countryName(c.countryCode, locale) : null].filter(Boolean).join(", ")}</p>
            <dl className="mt-3 grid gap-1 sm:grid-cols-[10rem_1fr]">
              <dt className="text-ink-muted">{t("modes")}</dt>
              <dd>{c.modes.map((m) => t(`modeNames.${m}` as "modeNames.ROAD")).join(", ")}</dd>
              <dt className="text-ink-muted">{t("countries")}</dt>
              <dd>{c.countries.map((cc) => countryName(cc, locale)).join(", ")}</dd>
              {c.fleet ? (
                <>
                  <dt className="text-ink-muted">{t("fleet")}</dt>
                  <dd className="whitespace-pre-line">{c.fleet}</dd>
                </>
              ) : null}
              <dt className="text-ink-muted">{t("admin.routes")}</dt>
              <dd>{c.routes}</dd>
            </dl>
            {c.description ? <p className="mt-2 text-ink-muted">{c.description}</p> : null}
            {c.decisionNote ? <p className="mt-2 whitespace-pre-line font-medium">{c.decisionNote}</p> : null}
          </section>

          <section className={box}>
            <h2 className="rb-title mb-3">{t("documents")}</h2>
            {!c.documents.length ? <p className="text-ink-muted">{t("admin.noDocuments")}</p> : null}
            <ul className="divide-y divide-line">
              {c.documents.map((d) => (
                <DocumentReview key={d.id} carrierId={id} document={d} required={c.requiredDocuments.includes(d.kind)} reviewing={reviewing} busy={busy} onReview={(body) => post(`documents/${d.id}/review`, body)} />
              ))}
            </ul>
          </section>
        </div>

        <aside className="flex flex-col gap-4">
          {reviewing || c.status === "REJECTED" ? (
            <section className={`${box} grid gap-3`}>
              <h2 className="rb-title">{t("admin.decision")}</h2>
              {c.owner && c.owner.email === ownEmail ? <p className="text-critical">{t("admin.ownApplication")}</p> : null}
              {reviewing ? (
                <>
                  {!c.ready ? <p className="text-ink-muted">{t("admin.notReady")}</p> : null}
                  <p className="text-ink-muted">{t("admin.approveHint")}</p>
                  <Button variant="primary" loading={busy} disabled={!c.ready} onClick={() => post("decision", { decision: "APPROVE" })}>
                    {t("admin.approve")}
                  </Button>
                </>
              ) : null}
              <Field label={t("admin.decisionNote")} hint={t("admin.carrierReads")}>
                <textarea className={`${input} h-auto min-h-[4rem] py-2`} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />
              </Field>
              <Button variant="secondary" loading={busy} disabled={note.trim().length < 3} onClick={() => post("decision", { decision: "NEEDS_CHANGES", note: note.trim() })}>
                {t("admin.askChanges")}
              </Button>
              {reviewing ? (
                <Button variant="secondary" loading={busy} disabled={note.trim().length < 3} onClick={() => post("decision", { decision: "REJECT", note: note.trim() })}>
                  {t("admin.reject")}
                </Button>
              ) : null}
            </section>
          ) : null}

          {c.status === "APPROVED" ? (
            <section className={`${box} grid gap-3`}>
              <h2 className="rb-title">{t("admin.suspend")}</h2>
              <p className="text-ink-muted">{t("admin.suspendHint")}</p>
              <Field label={t("admin.suspendReason")} hint={t("admin.carrierReads")}>
                <input className={input} maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)} />
              </Field>
              <Button variant="secondary" loading={busy} disabled={reason.trim().length < 3} onClick={() => post("suspend", { reason: reason.trim() })}>
                {t("admin.suspendCta")}
              </Button>
            </section>
          ) : null}
          {c.status === "SUSPENDED" ? (
            <section className={`${box} grid gap-3`}>
              <p className="text-ink-muted">{t("admin.reinstateHint")}</p>
              <Button variant="primary" loading={busy} onClick={() => post("reinstate")}>
                {t("admin.reinstate")}
              </Button>
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function DocumentReview({ carrierId, document: d, required, reviewing, busy, onReview }: { carrierId: string; document: CarrierApplication["documents"][number]; required: boolean; reviewing: boolean; busy: boolean; onReview: (body: unknown) => void }) {
  const t = useTranslations("carriers");
  const [refusing, setRefusing] = useState(false);
  const [note, setNote] = useState("");
  const kind = t(`kinds.${d.kind}` as "kinds.OTHER");
  return (
    <li className="py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">
          {kind}
          {required ? " *" : ""}
        </span>
        <Badge variant={DOCUMENT_TONE[d.status]}>{t(`documentStatuses.${d.status}`)}</Badge>
      </div>
      <a href={`/api/tracecart/carriers/applications/${carrierId}/documents/${d.id}/file`} target="_blank" rel="noreferrer" className="underline">
        {d.fileName}
      </a>
      {d.rejectNote ? <p className="text-critical">{d.rejectNote}</p> : null}
      {reviewing ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {d.status !== "APPROVED" ? (
            <Button variant="secondary" loading={busy} aria-label={t("admin.acceptOne", { kind })} onClick={() => onReview({ decision: "APPROVE" })}>
              {t("admin.accept")}
            </Button>
          ) : null}
          {!refusing ? (
            <button type="button" className="underline" onClick={() => setRefusing(true)}>
              {t("admin.refuse")}
            </button>
          ) : (
            <form
              className="flex flex-wrap items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                onReview({ decision: "REJECT", note: note.trim() });
              }}
            >
              <input className={`${input} max-w-xs`} required minLength={3} maxLength={500} aria-label={t("admin.refuseWhy")} placeholder={t("admin.refuseWhy")} value={note} onChange={(e) => setNote(e.target.value)} />
              <Button type="submit" variant="secondary" loading={busy} disabled={note.trim().length < 3}>
                {t("admin.refuse")}
              </Button>
            </form>
          )}
        </div>
      ) : null}
    </li>
  );
}
