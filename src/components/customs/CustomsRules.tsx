"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { Field, input } from "@/components/ui/form/Form";
import { call } from "@/components/checkout/http";
import { useFormat } from "@/lib/format";
import { COUNTRY_CODES, countryName } from "@/lib/country";

// Customs knowledge in the console (ADR-082): what applies on a corridor, the
// rules with their sources and verification, and the headings categories
// suggest. The API checks every call.

export const KINDS = ["PROHIBITED", "RESTRICTED", "DUTY", "LEVY", "VAT", "THRESHOLD", "DOCUMENT", "NOTE"] as const;
const CONFIDENCES = ["OFFICIAL", "SECONDARY", "ESTIMATE"] as const;
const BLOCS = ["UEMOA", "ECOWAS"];
const box = "rounded-[var(--radius-m)] border border-line bg-surface-raised p-5 text-sm";

type Text = { fr: string; en: string };

export interface Rule {
  id: string;
  lineageId: string;
  version: number;
  current: boolean;
  jurisdiction: string;
  kind: (typeof KINDS)[number];
  title: Text;
  details: Text | null;
  hsPrefix: string | null;
  categorySlug: string | null;
  originScope: string | null;
  originExcept: string | null;
  ratePercent: number | null;
  amountMinor: number | null;
  currency: string | null;
  base: string | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  source: { title: string; publisher: string | null; url: string | null; reference: string | null; retrievedOn: string | null };
  confidence: (typeof CONFIDENCES)[number];
  verified: boolean;
  verification: { by: string | null; at: string; note: string | null } | null;
  createdBy: string | null;
  createdAt: string;
  origin?: "applies" | "dependsOnOrigin";
}

const pick = (t: Text | null, locale: string) => (t ? (locale === "fr" ? t.fr : t.en) || t.fr || t.en : "");

function useJurisdictionName() {
  const locale = useLocale();
  return (j: string) => (BLOCS.includes(j) ? j : countryName(j, locale));
}

export function RuleFacts({ r }: { r: Rule }) {
  const t = useTranslations("customs");
  const locale = useLocale();
  const format = useFormat();
  const name = useJurisdictionName();
  const scope = [
    r.hsPrefix ? t("scope.hs", { code: r.hsPrefix }) : null,
    r.categorySlug ? t("scope.category", { slug: r.categorySlug }) : null,
    r.originScope ? t("scope.originOnly", { where: name(r.originScope) }) : null,
    r.originExcept ? t("scope.originExcept", { where: name(r.originExcept) }) : null,
  ].filter(Boolean);
  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="default">{t(`kinds.${r.kind}`)}</Badge>
        <span className="font-medium">{pick(r.title, locale)}</span>
        {r.ratePercent != null ? <span className="rb-numeral">{format.number(r.ratePercent)} %</span> : null}
        {r.verified ? <Badge variant="positive">{t("verified")}</Badge> : <Badge variant="attn">{t("unverified")}</Badge>}
        {r.origin === "dependsOnOrigin" ? <Badge variant="info">{t("dependsOnOrigin")}</Badge> : null}
      </div>
      {r.details ? <p className="text-ink-muted">{pick(r.details, locale)}</p> : null}
      <p className="text-xs text-ink-muted">
        {name(r.jurisdiction)} · {t("from", { date: format.date(r.effectiveFrom) })}
        {r.effectiveTo ? ` · ${t("until", { date: format.date(r.effectiveTo) })}` : ""}
        {r.base ? ` · ${t(`base.${r.base}` as "base.CUSTOMS_VALUE")}` : ""}
        {scope.length ? ` · ${scope.join(" · ")}` : ""}
      </p>
      <p className="text-xs">
        <span className="text-ink-muted">{t("source")} : </span>
        {r.source.url ? (
          <a href={r.source.url} target="_blank" rel="noreferrer" className="underline">
            {r.source.title}
          </a>
        ) : (
          r.source.title
        )}
        {r.source.publisher ? ` · ${r.source.publisher}` : ""}
        {r.source.reference ? ` · ${r.source.reference}` : ""} · {t(`confidence.${r.confidence}`)}
      </p>
      {r.verification ? <p className="text-xs text-ink-muted">{t("verifiedBy", { who: r.verification.by ?? "—", date: format.date(r.verification.at), note: r.verification.note ?? "" })}</p> : null}
    </div>
  );
}

// ---------------------------------------------------------------------------

export function CustomsConsole({ canWrite, canHeadings }: { canWrite: boolean; canHeadings: boolean }) {
  const t = useTranslations("customs");
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="rb-headline text-[28px]">{t("title")}</h1>
        <p className="mt-1 text-sm text-ink-muted">{t("lead")}</p>
      </div>
      <Corridor />
      <Rules canWrite={canWrite} />
      <Headings canWrite={canHeadings} />
    </div>
  );
}

interface CorridorView {
  to: string;
  from: string | null;
  at: string;
  blocs: { to: string[]; from: string[] };
  rules: Rule[];
  summary: { rules: number; verified: number };
  pricingRates: { id: string; productCategory: string | null; dutyPercent: number; taxPercent: number; brokerFee: number | null; currency: string; notes: string | null }[];
}

function Corridor() {
  const t = useTranslations("customs");
  const locale = useLocale();
  const [from, setFrom] = useState("BF");
  const [to, setTo] = useState("ML");
  const [c, setC] = useState<CorridorView | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (f: string, d: string) => {
    try {
      setC(await call<CorridorView>("GET", `/customs/corridor?to=${d}${f ? `&from=${f}` : ""}`));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load("BF", "ML");
  }, [load]);

  return (
    <section className="flex flex-col gap-3" aria-labelledby="customs-corridor">
      <h2 id="customs-corridor" className="rb-title">
        {t("corridor.title")}
      </h2>
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          load(from, to);
        }}
      >
        <Field label={t("corridor.from")}>
          <select className={input} value={from} onChange={(e) => setFrom(e.target.value)}>
            <option value="">{t("corridor.anyOrigin")}</option>
            {COUNTRY_CODES.map((cc) => (
              <option key={cc} value={cc}>
                {countryName(cc, locale)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("corridor.to")}>
          <select className={input} value={to} onChange={(e) => setTo(e.target.value)}>
            {COUNTRY_CODES.map((cc) => (
              <option key={cc} value={cc}>
                {countryName(cc, locale)}
              </option>
            ))}
          </select>
        </Field>
        <Button type="submit" variant="secondary">
          {t("corridor.show")}
        </Button>
      </form>
      {error ? <p className="text-critical">{error}</p> : null}
      {c ? (
        <div className={box}>
          <p className="mb-3">
            {t("corridor.summary", { rules: c.summary.rules, verified: c.summary.verified })}
            {c.blocs.to.length ? ` ${t("corridor.unions", { country: countryName(c.to, locale), unions: c.blocs.to.join(", ") })}` : ""}
          </p>
          {c.rules.length === 0 ? <p className="text-ink-muted">{t("corridor.none")}</p> : null}
          <ul className="divide-y divide-line">
            {c.rules.map((r) => (
              <li key={r.id} className="py-3">
                <RuleFacts r={r} />
                <Link href={`/customs/rules/${r.id}`} className="text-xs underline">
                  {t("open")}
                </Link>
              </li>
            ))}
          </ul>
          {c.pricingRates.length ? (
            <div className="mt-4 border-t border-line pt-3">
              <h3 className="rb-label mb-1">{t("corridor.pricing")}</h3>
              <p className="mb-2 text-xs text-ink-muted">{t("corridor.pricingHint")}</p>
              <ul className="grid gap-1">
                {c.pricingRates.map((p) => (
                  <li key={p.id}>
                    {p.productCategory ?? t("corridor.allCategories")} · {t("corridor.rate", { duty: p.dutyPercent, tax: p.taxPercent })}
                    {p.notes ? <span className="text-ink-muted"> · {p.notes}</span> : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function Rules({ canWrite }: { canWrite: boolean }) {
  const t = useTranslations("customs");
  const [items, setItems] = useState<Rule[]>([]);
  const [jurisdiction, setJurisdiction] = useState("");
  const [verified, setVerified] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const p = new URLSearchParams();
    if (jurisdiction) p.set("jurisdiction", jurisdiction);
    if (verified) p.set("verified", verified);
    try {
      setItems((await call<{ items: Rule[] }>("GET", `/customs/rules?${p}`)).items);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [jurisdiction, verified]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  return (
    <section className="flex flex-col gap-3" aria-labelledby="customs-rules">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="customs-rules" className="rb-title">
          {t("rules.title")}
        </h2>
        {canWrite && !adding ? (
          <Button variant="secondary" onClick={() => setAdding(true)}>
            {t("rules.add")}
          </Button>
        ) : null}
      </div>
      {adding ? (
        <RuleForm
          onCancel={() => setAdding(false)}
          onSave={async (body) => {
            await call("POST", "/customs/rules", body);
            setAdding(false);
            await load();
          }}
        />
      ) : null}
      <div className="flex flex-wrap gap-2">
        <input className={`${input} max-w-[10rem] uppercase`} aria-label={t("rules.jurisdiction")} placeholder={t("rules.jurisdiction")} value={jurisdiction} onChange={(e) => setJurisdiction(e.target.value.toUpperCase())} />
        <select className={`${input} max-w-[14rem]`} aria-label={t("rules.verification")} value={verified} onChange={(e) => setVerified(e.target.value)}>
          <option value="">{t("rules.all")}</option>
          <option value="false">{t("unverified")}</option>
          <option value="true">{t("verified")}</option>
        </select>
      </div>
      {error ? <p className="text-critical">{error}</p> : null}
      <ul className={`${box} divide-y divide-line`}>
        {items.map((r) => (
          <li key={r.id} className="py-3">
            <RuleFacts r={r} />
            <Link href={`/customs/rules/${r.id}`} className="text-xs underline">
              {t("rules.versionLink", { version: r.version })}
            </Link>
          </li>
        ))}
        {items.length === 0 ? <li className="py-3 text-ink-muted">{t("rules.empty")}</li> : null}
      </ul>
    </section>
  );
}

export function RuleForm({ rule, onSave, onCancel }: { rule?: Rule; onSave: (body: unknown) => Promise<void>; onCancel: () => void }) {
  const t = useTranslations("customs");
  const [f, setF] = useState({
    jurisdiction: rule?.jurisdiction ?? "ML",
    kind: rule?.kind ?? "DUTY",
    titleFr: rule?.title.fr ?? "",
    titleEn: rule?.title.en ?? "",
    detailsFr: rule?.details?.fr ?? "",
    detailsEn: rule?.details?.en ?? "",
    hsPrefix: rule?.hsPrefix ?? "",
    categorySlug: rule?.categorySlug ?? "",
    originMode: rule?.originScope ? "only" : rule?.originExcept ? "except" : "any",
    origin: rule?.originScope ?? rule?.originExcept ?? "",
    ratePercent: rule?.ratePercent != null ? String(rule.ratePercent) : "",
    base: rule?.base ?? "",
    effectiveFrom: rule?.effectiveFrom ?? new Date().toISOString().slice(0, 10),
    effectiveTo: rule?.effectiveTo ?? "",
    sourceTitle: rule?.source.title ?? "",
    sourcePublisher: rule?.source.publisher ?? "",
    sourceUrl: rule?.source.url ?? "",
    sourceReference: rule?.source.reference ?? "",
    confidence: rule?.confidence ?? "SECONDARY",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }));
  const opt = (v: string) => (v.trim() ? v.trim() : null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSave({
        jurisdiction: f.jurisdiction.trim().toUpperCase(),
        kind: f.kind,
        title: { fr: f.titleFr.trim(), en: f.titleEn.trim() },
        details: f.detailsFr.trim() || f.detailsEn.trim() ? { fr: f.detailsFr.trim(), en: f.detailsEn.trim() } : null,
        hsPrefix: opt(f.hsPrefix),
        categorySlug: opt(f.categorySlug),
        originScope: f.originMode === "only" ? opt(f.origin.toUpperCase()) : null,
        originExcept: f.originMode === "except" ? opt(f.origin.toUpperCase()) : null,
        ratePercent: f.ratePercent.trim() ? Number(f.ratePercent.replace(",", ".")) : null,
        base: opt(f.base),
        effectiveFrom: f.effectiveFrom,
        effectiveTo: opt(f.effectiveTo),
        source: { title: f.sourceTitle.trim(), publisher: opt(f.sourcePublisher), url: opt(f.sourceUrl), reference: opt(f.sourceReference) },
        confidence: f.confidence,
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className={`${box} grid gap-3 md:grid-cols-2`} aria-label={rule ? t("form.newVersion") : t("rules.add")}>
      {rule ? <p className="text-ink-muted md:col-span-2">{t("form.versionHint")}</p> : null}
      <Field label={t("form.jurisdiction")} required hint={t("form.jurisdictionHint")}>
        <input className={`${input} uppercase`} required value={f.jurisdiction} onChange={set("jurisdiction")} />
      </Field>
      <Field label={t("form.kind")} required>
        <select className={input} value={f.kind} onChange={set("kind")}>
          {KINDS.map((k) => (
            <option key={k} value={k}>
              {t(`kinds.${k}`)}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t("form.titleFr")} required>
        <input className={input} required maxLength={300} value={f.titleFr} onChange={set("titleFr")} />
      </Field>
      <Field label={t("form.titleEn")} required>
        <input className={input} required maxLength={300} value={f.titleEn} onChange={set("titleEn")} />
      </Field>
      <Field label={t("form.detailsFr")}>
        <textarea className={`${input} h-auto py-2`} rows={2} value={f.detailsFr} onChange={set("detailsFr")} />
      </Field>
      <Field label={t("form.detailsEn")}>
        <textarea className={`${input} h-auto py-2`} rows={2} value={f.detailsEn} onChange={set("detailsEn")} />
      </Field>
      <Field label={t("form.hsPrefix")} hint={t("form.allGoodsHint")}>
        <input className={input} value={f.hsPrefix} onChange={set("hsPrefix")} />
      </Field>
      <Field label={t("form.category")} hint={t("form.allGoodsHint")}>
        <input className={input} value={f.categorySlug} onChange={set("categorySlug")} />
      </Field>
      <Field label={t("form.origin")}>
        <select className={input} value={f.originMode} onChange={set("originMode")}>
          <option value="any">{t("form.originAny")}</option>
          <option value="only">{t("form.originOnly")}</option>
          <option value="except">{t("form.originExcept")}</option>
        </select>
      </Field>
      {f.originMode !== "any" ? (
        <Field label={t("form.originWhere")} required hint={t("form.jurisdictionHint")}>
          <input className={`${input} uppercase`} required value={f.origin} onChange={set("origin")} />
        </Field>
      ) : (
        <span />
      )}
      <Field label={t("form.rate")}>
        <input className={input} inputMode="decimal" value={f.ratePercent} onChange={set("ratePercent")} />
      </Field>
      <Field label={t("form.base")}>
        <select className={input} value={f.base} onChange={set("base")}>
          <option value="">—</option>
          <option value="CUSTOMS_VALUE">{t("base.CUSTOMS_VALUE")}</option>
          <option value="CUSTOMS_VALUE_PLUS_DUTIES">{t("base.CUSTOMS_VALUE_PLUS_DUTIES")}</option>
        </select>
      </Field>
      <Field label={t("form.effectiveFrom")} required>
        <input className={input} type="date" required value={f.effectiveFrom} onChange={set("effectiveFrom")} />
      </Field>
      <Field label={t("form.effectiveTo")}>
        <input className={input} type="date" value={f.effectiveTo} onChange={set("effectiveTo")} />
      </Field>
      <Field label={t("form.sourceTitle")} required hint={t("form.sourceHint")} className="md:col-span-2">
        <input className={input} required minLength={3} maxLength={500} value={f.sourceTitle} onChange={set("sourceTitle")} />
      </Field>
      <Field label={t("form.sourcePublisher")}>
        <input className={input} maxLength={200} value={f.sourcePublisher} onChange={set("sourcePublisher")} />
      </Field>
      <Field label={t("form.sourceReference")}>
        <input className={input} maxLength={300} value={f.sourceReference} onChange={set("sourceReference")} />
      </Field>
      <Field label={t("form.sourceUrl")}>
        <input className={input} type="url" maxLength={1000} value={f.sourceUrl} onChange={set("sourceUrl")} />
      </Field>
      <Field label={t("form.confidence")} required>
        <select className={input} value={f.confidence} onChange={set("confidence")}>
          {CONFIDENCES.map((c) => (
            <option key={c} value={c}>
              {t(`confidence.${c}`)}
            </option>
          ))}
        </select>
      </Field>
      {error ? (
        <p role="alert" className="text-critical md:col-span-2">
          {error}
        </p>
      ) : null}
      <div className="flex gap-3 md:col-span-2">
        <Button type="submit" variant="primary" loading={busy}>
          {rule ? t("form.saveVersion") : t("form.save")}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          {t("form.cancel")}
        </Button>
      </div>
    </form>
  );
}

export function RuleDetail({ id, canWrite }: { id: string; canWrite: boolean }) {
  const t = useTranslations("customs");
  const format = useFormat();
  const [d, setD] = useState<{ rule: Rule; versions: Rule[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => call<{ rule: Rule; versions: Rule[] }>("GET", `/customs/rules/${id}`).then(setD, (e) => setError((e as Error).message)), [id]);
  useEffect(() => {
    load();
  }, [load]);

  if (!d) return error ? <p className="text-critical">{error}</p> : <p className="text-ink-muted">…</p>;
  const r = d.rule;

  return (
    <div className="flex flex-col gap-4">
      <Link href="/customs" className="text-sm text-ink-muted hover:text-ink">
        ← {t("title")}
      </Link>
      <h1 className="rb-headline text-[26px]">{t("rules.version", { version: r.version })}</h1>
      {error ? (
        <p role="alert" className="text-critical">
          {error}
        </p>
      ) : null}
      <section className={box}>
        <RuleFacts r={r} />
        {!r.current ? <p className="mt-2 font-medium">{t("rules.replaced")}</p> : null}
      </section>
      {canWrite && r.current && !r.verified ? (
        <form
          className={`${box} grid max-w-xl gap-3`}
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError(null);
            try {
              setD(await call("POST", `/customs/rules/${r.id}/verify`, { note: note.trim() }));
            } catch (err) {
              setError((err as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <h2 className="rb-label">{t("verify.title")}</h2>
          <p className="text-ink-muted">{t("verify.hint")}</p>
          <Field label={t("verify.note")} required>
            <textarea className={`${input} h-auto py-2`} rows={2} required minLength={3} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          <Button type="submit" variant="primary" loading={busy} disabled={note.trim().length < 3} className="justify-self-start">
            {t("verify.cta")}
          </Button>
        </form>
      ) : null}
      {canWrite && r.current ? (
        editing ? (
          <RuleForm
            rule={r}
            onCancel={() => setEditing(false)}
            onSave={async (body) => {
              const next = await call<{ rule: Rule; versions: Rule[] }>("POST", `/customs/rules/${r.id}/versions`, body);
              setEditing(false);
              setD(next);
              window.history.replaceState(null, "", window.location.pathname.replace(r.id, next.rule.id));
            }}
          />
        ) : (
          <Button variant="secondary" className="self-start" onClick={() => setEditing(true)}>
            {t("form.newVersion")}
          </Button>
        )
      ) : null}
      <section className={box} aria-labelledby="rule-versions">
        <h2 id="rule-versions" className="rb-label mb-2">
          {t("rules.versions")}
        </h2>
        <ul className="divide-y divide-line">
          {d.versions.map((v) => (
            <li key={v.id} className="flex flex-wrap items-center gap-2 py-2">
              <Link href={`/customs/rules/${v.id}`} className="underline">
                {t("rules.version", { version: v.version })}
              </Link>
              {v.current ? <Badge variant="info">{t("rules.currentVersion")}</Badge> : null}
              {v.verified ? <Badge variant="positive">{t("verified")}</Badge> : <Badge variant="attn">{t("unverified")}</Badge>}
              <span className="text-xs text-ink-muted">
                {t("rules.enteredBy", { who: v.createdBy ?? t("rules.loaded"), date: format.date(v.createdAt) })}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------

interface CategoryRow {
  id: string;
  slug: string;
  name: Text;
  parentId: string | null;
  hsHeading: string | null;
}

function Headings({ canWrite }: { canWrite: boolean }) {
  const t = useTranslations("customs");
  const locale = useLocale();
  const [rows, setRows] = useState<CategoryRow[]>([]);
  const [q, setQ] = useState("");
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    call<{ items: CategoryRow[] }>("GET", "/customs/categories").then(
      (r) => setRows(r.items),
      (e) => setError((e as Error).message)
    );
  }, []);
  const shown = rows.filter((c) => !q || c.slug.includes(q.toLowerCase()) || pick(c.name, locale).toLowerCase().includes(q.toLowerCase())).slice(0, 40);

  async function save(c: CategoryRow) {
    setError(null);
    try {
      const value = (draft[c.id] ?? "").trim();
      const r = await call<{ items: CategoryRow[] }>("PUT", `/customs/categories/${c.id}/heading`, { hsHeading: value || null });
      setRows(r.items);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <section className="flex flex-col gap-3" aria-labelledby="customs-headings">
      <h2 id="customs-headings" className="rb-title">
        {t("headings.title")}
      </h2>
      <p className="text-sm text-ink-muted">{t("headings.hint")}</p>
      <input className={`${input} max-w-sm`} aria-label={t("headings.search")} placeholder={t("headings.search")} value={q} onChange={(e) => setQ(e.target.value)} />
      {error ? <p className="text-critical">{error}</p> : null}
      <ul className={`${box} divide-y divide-line`}>
        {shown.map((c) => (
          <li key={c.id} className="flex flex-wrap items-center gap-3 py-2">
            <span className="min-w-[14rem] flex-1">
              {pick(c.name, locale)} <span className="rb-mono text-xs text-ink-muted">{c.slug}</span>
            </span>
            {canWrite ? (
              <>
                <input className={`${input} rb-mono w-32`} aria-label={t("headings.for", { name: pick(c.name, locale) })} placeholder="8467" value={draft[c.id] ?? c.hsHeading ?? ""} onChange={(e) => setDraft((d) => ({ ...d, [c.id]: e.target.value }))} />
                <Button variant="secondary" onClick={() => save(c)}>
                  {t("headings.save")}
                </Button>
              </>
            ) : (
              <span className="rb-mono">{c.hsHeading ?? "—"}</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
