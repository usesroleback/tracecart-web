"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { Field, input } from "@/components/ui/form/Form";
import { call } from "@/components/checkout/http";
import { QueueChip, useListFilters } from "@/components/console/ListTools";
import { useFormat } from "@/lib/format";
import { countryName } from "@/lib/country";
import { Application, DOCUMENT_TONE, percent, SELLER_TONE, SellerStatus } from "./SellerPanel";

// Seller applications and the marketplace's terms in the console (ADR-050). The
// API checks every call; opening a document or a whole account number is audited.

const STATUSES: SellerStatus[] = ["SUBMITTED", "NEEDS_CHANGES", "APPROVED", "REJECTED", "SUSPENDED", "DRAFT"];
const LIST_FILTERS = ["q", "status", "queue"] as const;
const box = "rounded-[var(--radius-m)] border border-line bg-surface-raised p-5 text-sm";

interface Row {
  id: string;
  name: string;
  email: string | null;
  countryCode: string | null;
  city: string;
  status: SellerStatus;
  submittedAt: string | null;
  payoutToConfirm: boolean;
}

export function SellersList() {
  const t = useTranslations("sellers");
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
      const res = await call<{ items: Row[]; nextCursor: string | null }>("GET", `/sellers?${p}`);
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
    <div>
      <h1 className="rb-headline mb-1 text-[28px]">{t("title")}</h1>
      <p className="mb-6 text-sm text-ink-muted">{t("lead")}</p>
      {applied.queue ? <QueueChip label={t(`queues.${applied.queue}` as "queues.toReview")} onClear={() => apply({ ...applied, queue: "" })} /> : null}
      <form
        role="search"
        className="mb-4 flex flex-wrap gap-2"
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          apply({ ...applied, q });
        }}
      >
        <input className={`${input} max-w-sm`} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search")} aria-label={t("search")} />
        <select className={`${input} max-w-[14rem]`} aria-label={t("status")} value={applied.status} onChange={(e) => apply({ ...applied, q, status: e.target.value })}>
          <option value="">{t("allStatuses")}</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {t(`statuses.${s}`)}
            </option>
          ))}
        </select>
        <Button type="submit" variant="secondary">
          {t("find")}
        </Button>
      </form>
      {error ? <p className="mb-4 text-sm text-critical">{error}</p> : null}
      <div tabIndex={0} className="overflow-x-auto rounded-[var(--radius-m)] border border-line bg-surface-raised">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line text-ink-muted">
            <tr>
              <th className="px-4 py-3 font-medium">{t("columns.seller")}</th>
              <th className="px-4 py-3 font-medium">{t("columns.status")}</th>
              <th className="px-4 py-3 font-medium">{t("columns.place")}</th>
              <th className="px-4 py-3 font-medium">{t("columns.submitted")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-surface-sunken">
                <td className="px-4 py-3">
                  <Link href={`/sellers/${r.id}`} className="font-medium text-ink hover:underline">
                    {r.name}
                  </Link>
                  <p className="text-xs text-ink-muted">{r.email}</p>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={SELLER_TONE[r.status]}>{t(`statuses.${r.status}`)}</Badge>
                  {r.payoutToConfirm ? <p className="mt-1 text-xs text-critical">{t("payoutUnconfirmed")}</p> : null}
                </td>
                <td className="px-4 py-3">
                  {r.city}
                  {r.countryCode ? `, ${countryName(r.countryCode, locale)}` : ""}
                </td>
                <td className="px-4 py-3 text-ink-muted">{r.submittedAt ? format.shortDate(r.submittedAt) : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && !error ? <p className="px-4 py-8 text-center text-ink-muted">{t("empty")}</p> : null}
      </div>
      {cursor ? (
        <Button variant="secondary" className="mt-4" onClick={() => load(cursor, query)}>
          {t("more")}
        </Button>
      ) : null}
    </div>
  );
}

type Detail = Application & { email: string | null; owner: { name: string; email: string } | null; commissionOverrideBps: number | null; ready: boolean };

export function SellerDetail({ id, canSetCommission, ownId }: { id: string; canSetCommission: boolean; ownId: string }) {
  const t = useTranslations("sellers");
  const locale = useLocale();
  const [s, setS] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  const [account, setAccount] = useState<string | null>(null);
  const [rate, setRate] = useState("");

  useEffect(() => {
    call<Detail>("GET", `/sellers/${id}`).then(
      (d) => {
        setS(d);
        setRate(d.commissionOverrideBps != null ? String(d.commissionOverrideBps / 100) : "");
      },
      (e) => setError((e as Error).message)
    );
  }, [id]);

  async function act(fn: () => Promise<Detail>) {
    setBusy(true);
    setError(null);
    try {
      setS(await fn());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const post = (path: string, body?: unknown) => act(() => call<Detail>("POST", `/sellers/${id}/${path}`, body));

  if (!s) return error ? <p className="text-sm text-critical">{error}</p> : <p className="text-sm text-ink-muted">{t("loading")}</p>;
  const reviewing = s.status === "SUBMITTED";

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link href="/sellers" className="text-sm text-ink-muted hover:text-ink">
          {t("title")}
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="rb-headline text-[28px]">{s.name}</h1>
          <Badge variant={SELLER_TONE[s.status]}>{t(`statuses.${s.status}`)}</Badge>
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
              {s.owner?.name} · {s.owner?.email ?? s.email}
            </p>
            <p>
              {s.phone}
              {s.taxId ? ` · ${s.taxId}` : ""}
            </p>
            <p>
              {[s.addressLine, s.city, s.countryCode ? countryName(s.countryCode, locale) : null].filter(Boolean).join(", ")}
            </p>
            {s.description ? <p className="mt-2 text-ink-muted">{s.description}</p> : null}
            {s.decisionNote ? <p className="mt-2 whitespace-pre-line font-medium">{s.decisionNote}</p> : null}
          </section>

          <section className={box}>
            <h2 className="rb-title mb-3">{t("documents")}</h2>
            {!s.documents.length ? <p className="text-ink-muted">{t("noDocuments")}</p> : null}
            <ul className="divide-y divide-line">
              {s.documents.map((d) => (
                <DocumentReview key={d.id} sellerId={id} document={d} required={s.terms.requiredDocuments.includes(d.kind)} reviewing={reviewing} busy={busy} onReview={(body) => post(`documents/${d.id}/review`, body)} />
              ))}
            </ul>
          </section>

          <section className={box}>
            <h2 className="rb-title mb-3">{t("payout")}</h2>
            {s.payout ? (
              <>
                <p>
                  {t(`methods.${s.payout.method}`)} · {s.payout.provider} · {s.payout.holderName}
                </p>
                <p className="rb-mono-s mt-1">{account ?? t("payoutEndingShort", { ending: s.payout.accountEnding })}</p>
                <div className="mt-2 flex flex-wrap gap-3">
                  {!account ? (
                    <button
                      type="button"
                      className="underline"
                      onClick={() =>
                        call<{ account: string }>("POST", `/sellers/${id}/payout/reveal`).then(
                          (r) => setAccount(r.account),
                          (e) => setError((e as Error).message)
                        )
                      }
                    >
                      {t("reveal")}
                    </button>
                  ) : null}
                  {s.status === "APPROVED" && !s.payout.confirmed ? (
                    <Button variant="primary" loading={busy} onClick={() => post("payout/confirm")}>
                      {t("confirmPayout")}
                    </Button>
                  ) : null}
                </div>
                <p className="mt-2 text-xs text-ink-muted">{t("revealHint")}</p>
              </>
            ) : (
              <p className="text-ink-muted">{t("noPayout")}</p>
            )}
          </section>
        </div>

        <aside className="flex flex-col gap-4">
          {reviewing || s.status === "REJECTED" ? (
            <section className={`${box} grid gap-3`}>
              <h2 className="rb-title">{t("decision")}</h2>
              {s.owner && s.owner.email === ownId ? <p className="text-critical">{t("ownApplication")}</p> : null}
              {reviewing ? (
                <>
                  {!s.ready ? <p className="text-ink-muted">{t("notReady")}</p> : null}
                  <Button variant="primary" loading={busy} disabled={!s.ready} onClick={() => post("decision", { decision: "APPROVE" })}>
                    {t("approve")}
                  </Button>
                </>
              ) : null}
              <Field label={t("decisionNote")} hint={t("sellerReads")}>
                <textarea className={`${input} h-auto min-h-[4rem] py-2`} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />
              </Field>
              <Button variant="secondary" loading={busy} disabled={note.trim().length < 3} onClick={() => post("decision", { decision: "NEEDS_CHANGES", note: note.trim() })}>
                {t("askChanges")}
              </Button>
              {reviewing ? (
                <Button variant="secondary" loading={busy} disabled={note.trim().length < 3} onClick={() => post("decision", { decision: "REJECT", note: note.trim() })}>
                  {t("reject")}
                </Button>
              ) : null}
            </section>
          ) : null}

          {s.status === "APPROVED" ? (
            <section className={`${box} grid gap-3`}>
              <h2 className="rb-title">{t("suspend")}</h2>
              <p className="text-ink-muted">{t("suspendHint")}</p>
              <Field label={t("suspendReason")} hint={t("sellerReads")}>
                <input className={input} maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)} />
              </Field>
              <Button variant="secondary" loading={busy} disabled={reason.trim().length < 3} onClick={() => post("suspend", { reason: reason.trim() })}>
                {t("suspendCta")}
              </Button>
            </section>
          ) : null}
          {s.status === "SUSPENDED" ? (
            <section className={box}>
              <Button variant="primary" loading={busy} onClick={() => post("reinstate")}>
                {t("reinstate")}
              </Button>
            </section>
          ) : null}

          <section className={`${box} grid gap-3`}>
            <h2 className="rb-title">{t("commission")}</h2>
            <p>
              {percent(s.terms.commissionBps)} · {s.commissionOverrideBps != null ? t("rateOwn") : t("rateUsual")}
            </p>
            {canSetCommission ? (
              <form
                className="grid gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  act(() => call<Detail>("PUT", `/sellers/${id}/commission`, { bps: rate.trim() === "" ? null : Math.round(Number(rate) * 100) }));
                }}
              >
                <Field label={t("rateForSeller")} hint={t("rateForSellerHint")}>
                  <input className={input} inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} />
                </Field>
                <Button type="submit" variant="secondary" loading={busy} disabled={rate.trim() !== "" && !validPercent(rate)}>
                  {t("saveRate")}
                </Button>
              </form>
            ) : null}
          </section>
        </aside>
      </div>
    </div>
  );
}

const validPercent = (v: string) => /^\d{1,3}([.,]\d{1,2})?$/.test(v.trim()) && Number(v.replace(",", ".")) <= 100;

function DocumentReview({ sellerId, document: d, required, reviewing, busy, onReview }: { sellerId: string; document: Application["documents"][number]; required: boolean; reviewing: boolean; busy: boolean; onReview: (body: unknown) => void }) {
  const t = useTranslations("sellers");
  const [refusing, setRefusing] = useState(false);
  const [note, setNote] = useState("");
  return (
    <li className="py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">
          {t(`kinds.${d.kind}` as "kinds.OTHER")}
          {required ? " *" : ""}
        </span>
        <Badge variant={DOCUMENT_TONE[d.status]}>{t(`documentStatuses.${d.status}`)}</Badge>
      </div>
      <a href={`/api/tracecart/sellers/${sellerId}/documents/${d.id}/file`} target="_blank" rel="noreferrer" className="underline">
        {d.fileName}
      </a>
      {d.rejectNote ? <p className="text-critical">{d.rejectNote}</p> : null}
      {reviewing ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {d.status !== "APPROVED" ? (
            <Button variant="secondary" loading={busy} aria-label={t("acceptOne", { kind: t(`kinds.${d.kind}` as "kinds.OTHER") })} onClick={() => onReview({ decision: "APPROVE" })}>
              {t("accept")}
            </Button>
          ) : null}
          {!refusing ? (
            <button type="button" className="underline" onClick={() => setRefusing(true)}>
              {t("refuse")}
            </button>
          ) : (
            <form
              className="flex flex-wrap items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                onReview({ decision: "REJECT", note: note.trim() });
              }}
            >
              <input className={`${input} max-w-xs`} required minLength={3} maxLength={500} aria-label={t("refuseWhy")} placeholder={t("refuseWhy")} value={note} onChange={(e) => setNote(e.target.value)} />
              <Button type="submit" variant="secondary" loading={busy} disabled={note.trim().length < 3}>
                {t("refuse")}
              </Button>
            </form>
          )}
        </div>
      ) : null}
    </li>
  );
}

// ---------------------------------------------------------------------------
// The marketplace's terms

interface Settings {
  defaultCommissionBps: number;
  payoutHoldDays: number;
  requiredDocuments: string[];
}
interface CategoryRate {
  categoryId: string;
  slug: string;
  name: Record<string, string>;
  bps: number;
}

const KINDS = ["BUSINESS_REGISTRATION", "OWNER_ID", "TAX_CERTIFICATE", "PAYOUT_PROOF", "OTHER"];

export function SellerSettings({ canWrite }: { canWrite: boolean }) {
  const t = useTranslations("sellers");
  const locale = useLocale();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [rates, setRates] = useState<CategoryRate[]>([]);
  const [categories, setCategories] = useState<{ id: string; slug: string; name: Record<string, string> }[]>([]);
  const [commission, setCommission] = useState("");
  const [hold, setHold] = useState("");
  const [required, setRequired] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [newRate, setNewRate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const labelOf = (name: Record<string, string>, slug: string) => name[locale] ?? name.fr ?? slug;

  const apply = useCallback((s: Settings) => {
    setSettings(s);
    setCommission(String(s.defaultCommissionBps / 100));
    setHold(String(s.payoutHoldDays));
    setRequired(s.requiredDocuments);
  }, []);

  useEffect(() => {
    call<{ settings: Settings; categories: CategoryRate[] }>("GET", "/sellers/settings").then(
      (r) => {
        apply(r.settings);
        setRates(r.categories);
      },
      (e) => setError((e as Error).message)
    );
    if (canWrite) {
      call<{ categories: { id: string; slug: string; name: Record<string, string> }[] }>("GET", "/admin/catalog/categories").then(
        (r) => setCategories(r.categories),
        () => undefined
      );
    }
  }, [apply, canWrite]);

  async function act(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await fn();
      setSaved(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!settings) return error ? <p className="text-sm text-critical">{error}</p> : <p className="text-sm text-ink-muted">{t("loading")}</p>;
  const valid = validPercent(commission) && /^\d{1,3}$/.test(hold.trim()) && Number(hold) <= 120 && required.length > 0;

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <div>
        <h1 className="rb-headline mb-1 text-[28px]">{t("settingsTitle")}</h1>
        <p className="text-sm text-ink-muted">{t("settingsLead")}</p>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-critical">
          {error}
        </p>
      ) : null}
      {saved ? (
        <p role="status" className="text-sm text-positive">
          {t("saved")}
        </p>
      ) : null}
      <form
        className={`${box} grid gap-4 sm:grid-cols-2`}
        onSubmit={(e) => {
          e.preventDefault();
          act(async () => apply(await call<Settings>("PATCH", "/sellers/settings", { defaultCommissionBps: Math.round(Number(commission.replace(",", ".")) * 100), payoutHoldDays: Number(hold), requiredDocuments: required })));
        }}
      >
        <Field label={t("defaultCommission")} hint={t("defaultCommissionHint")} required>
          <input className={input} inputMode="decimal" required disabled={!canWrite} value={commission} onChange={(e) => setCommission(e.target.value)} />
        </Field>
        <Field label={t("holdSetting")} hint={t("holdSettingHint")} required>
          <input className={input} inputMode="numeric" required disabled={!canWrite} value={hold} onChange={(e) => setHold(e.target.value)} />
        </Field>
        <fieldset className="sm:col-span-2">
          <legend className="mb-2 font-medium">{t("requiredDocuments")}</legend>
          <div className="grid gap-2">
            {KINDS.map((k) => (
              <label key={k} className="flex items-center gap-2">
                <input type="checkbox" disabled={!canWrite} checked={required.includes(k)} onChange={(e) => setRequired((r) => (e.target.checked ? [...r, k] : r.filter((x) => x !== k)))} />
                {t(`kinds.${k}` as "kinds.OTHER")}
              </label>
            ))}
          </div>
        </fieldset>
        {canWrite ? (
          <div className="sm:col-span-2">
            <Button type="submit" variant="primary" loading={busy} disabled={!valid}>
              {t("saveSettings")}
            </Button>
          </div>
        ) : null}
      </form>

      <section className={box}>
        <h2 className="rb-title mb-1">{t("categoryRates")}</h2>
        <p className="mb-3 text-ink-muted">{t("categoryRatesHint")}</p>
        {rates.length ? (
          <ul className="mb-3 divide-y divide-line">
            {rates.map((r) => (
              <li key={r.categoryId} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span>{labelOf(r.name, r.slug)}</span>
                <span className="flex items-center gap-3">
                  <span className="rb-numeral">{percent(r.bps)}</span>
                  {canWrite ? (
                    <button type="button" className="underline" onClick={() => act(async () => setRates((await call<{ items: CategoryRate[] }>("DELETE", `/sellers/settings/categories/${r.categoryId}`)).items))}>
                      {t("removeRate")}
                    </button>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mb-3 text-ink-muted">{t("noCategoryRates")}</p>
        )}
        {canWrite ? (
          <form
            className="grid gap-2 sm:grid-cols-[1fr_8rem_auto] sm:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              act(async () => {
                setRates((await call<{ items: CategoryRate[] }>("PUT", `/sellers/settings/categories/${newCategory}`, { bps: Math.round(Number(newRate.replace(",", ".")) * 100) })).items);
                setNewCategory("");
                setNewRate("");
              });
            }}
          >
            <Field label={t("category")}>
              <select className={input} required value={newCategory} onChange={(e) => setNewCategory(e.target.value)}>
                <option value="">{t("pickCategory")}</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {labelOf(c.name, c.slug)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t("categoryRate")}>
              <input className={input} inputMode="decimal" required value={newRate} onChange={(e) => setNewRate(e.target.value)} />
            </Field>
            <Button type="submit" variant="secondary" loading={busy} disabled={!newCategory || !validPercent(newRate)}>
              {t("saveRate")}
            </Button>
          </form>
        ) : null}
      </section>
    </div>
  );
}
