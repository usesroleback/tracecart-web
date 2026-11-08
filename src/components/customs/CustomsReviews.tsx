"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { Field, input } from "@/components/ui/form/Form";
import { call } from "@/components/checkout/http";
import { useFormat } from "@/lib/format";

// Customs cases (ADR-082): opened by checkout, freight and staff, given to
// the customs officer with the fewest open cases. A "code needed" case holds
// the product's customs-code panel: suggestions are never binding until
// someone confirms one.

type Reason = "HS_CODE_NEEDED" | "RESTRICTED_GOODS" | "DOCUMENTS_NEEDED" | "OTHER";
const STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED", "DISMISSED"] as const;
const TONE: Record<string, "attn" | "info" | "positive" | "default"> = { OPEN: "attn", IN_PROGRESS: "info", RESOLVED: "positive", DISMISSED: "default" };
const box = "rounded-[var(--radius-m)] border border-line bg-surface-raised p-5 text-sm";

type Text = { fr: string; en: string };
const pick = (t: Text | null | undefined, locale: string) => (t ? (locale === "fr" ? t.fr : t.en) || t.fr || t.en : "");

interface Review {
  id: string;
  reference: string;
  reason: Reason;
  status: (typeof STATUSES)[number];
  summary: string;
  jurisdiction: string | null;
  product: { id: string; slug: string; title: Text; hsCode: string | null } | null;
  order: { id: string; reference: string } | null;
  freightRequest: { reference: string } | null;
  assignee: { id: string; name: string } | null;
  resolution: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

interface Officer {
  id: string;
  name: string;
  email: string;
}

export function CustomsReviewsList() {
  const t = useTranslations("customs.reviews");
  const format = useFormat();
  const [filter, setFilter] = useState<{ assignee: string; status: string }>({ assignee: "me", status: "" });
  const [items, setItems] = useState<Review[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const p = new URLSearchParams();
    if (filter.assignee) p.set("assignee", filter.assignee);
    if (filter.status) p.set("status", filter.status);
    call<{ items: Review[] }>("GET", `/customs/reviews?${p}`).then(
      (r) => setItems(r.items),
      (e) => setError((e as Error).message)
    );
  }, [filter]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="rb-headline text-[28px]">{t("title")}</h1>
        <p className="mt-1 text-sm text-ink-muted">{t("lead")}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <select className={`${input} max-w-[14rem]`} aria-label={t("whose")} value={filter.assignee} onChange={(e) => setFilter((f) => ({ ...f, assignee: e.target.value }))}>
          <option value="me">{t("mine")}</option>
          <option value="none">{t("unassigned")}</option>
          <option value="">{t("everyone")}</option>
        </select>
        <select className={`${input} max-w-[14rem]`} aria-label={t("statusLabel")} value={filter.status} onChange={(e) => setFilter((f) => ({ ...f, status: e.target.value }))}>
          <option value="">{t("working")}</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {t(`status.${s}`)}
            </option>
          ))}
        </select>
      </div>
      {error ? <p className="text-critical">{error}</p> : null}
      <ul className="grid gap-3">
        {items.map((r) => (
          <li key={r.id} className={box}>
            <div className="flex flex-wrap items-center gap-2">
              <Link href={`/customs/reviews/${r.id}`} className="rb-mono font-medium underline">
                {r.reference}
              </Link>
              <Badge variant={TONE[r.status]}>{t(`status.${r.status}`)}</Badge>
              <Badge variant="default">{t(`reasons.${r.reason}`)}</Badge>
              {r.jurisdiction ? <span className="text-ink-muted">{r.jurisdiction}</span> : null}
            </div>
            <p className="mt-1">{r.summary}</p>
            <p className="text-xs text-ink-muted">
              {format.dayTime(r.createdAt)} · {r.assignee ? r.assignee.name : t("nobody")}
            </p>
          </li>
        ))}
      </ul>
      {items.length === 0 && !error ? <p className="text-ink-muted">{t("empty")}</p> : null}
    </div>
  );
}

export function CustomsReviewDetail({ id, me }: { id: string; me: string }) {
  const t = useTranslations("customs.reviews");
  const locale = useLocale();
  const format = useFormat();
  const [r, setR] = useState<Review | null>(null);
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resolution, setResolution] = useState("");

  const load = useCallback(async () => {
    try {
      const [review, list] = await Promise.all([call<Review>("GET", `/customs/reviews/${id}`), call<{ officers: Officer[] }>("GET", "/customs/reviews?limit=1")]);
      setR(review);
      setOfficers(list.officers);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [id]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function post(path: string, body?: unknown) {
    setBusy(true);
    setError(null);
    try {
      setR(await call<Review>("POST", `/customs/reviews/${id}/${path}`, body));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!r) return error ? <p className="text-critical">{error}</p> : <p className="text-ink-muted">…</p>;
  const working = r.status === "OPEN" || r.status === "IN_PROGRESS";

  return (
    <div className="flex flex-col gap-4">
      <Link href="/customs/reviews" className="text-sm text-ink-muted hover:text-ink">
        ← {t("title")}
      </Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="rb-headline rb-mono text-[26px]">{r.reference}</h1>
        <Badge variant={TONE[r.status]}>{t(`status.${r.status}`)}</Badge>
        <Badge variant="default">{t(`reasons.${r.reason}`)}</Badge>
      </div>
      {error ? (
        <p role="alert" className="text-critical">
          {error}
        </p>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-4">
          <section className={box}>
            <p>{r.summary}</p>
            <dl className="mt-3 grid gap-1 sm:grid-cols-[10rem_1fr]">
              {r.jurisdiction ? (
                <>
                  <dt className="text-ink-muted">{t("jurisdiction")}</dt>
                  <dd>{r.jurisdiction}</dd>
                </>
              ) : null}
              {r.product ? (
                <>
                  <dt className="text-ink-muted">{t("product")}</dt>
                  <dd>{pick(r.product.title, locale)}</dd>
                </>
              ) : null}
              {r.order ? (
                <>
                  <dt className="text-ink-muted">{t("order")}</dt>
                  <dd className="rb-mono">{r.order.reference}</dd>
                </>
              ) : null}
              {r.freightRequest ? (
                <>
                  <dt className="text-ink-muted">{t("freight")}</dt>
                  <dd>
                    <Link href={`/freight-requests/${r.freightRequest.reference}`} className="rb-mono underline">
                      {r.freightRequest.reference}
                    </Link>
                  </dd>
                </>
              ) : null}
              <dt className="text-ink-muted">{t("opened")}</dt>
              <dd>{format.dayTime(r.createdAt)}</dd>
            </dl>
            {r.resolution ? <p className="mt-3 font-medium">{t("decided", { what: r.resolution })}</p> : null}
          </section>
          {r.product ? <HsPanel productId={r.product.id} onConfirmed={load} /> : null}
        </div>
        <aside className="flex flex-col gap-4">
          <section className={`${box} grid gap-3`}>
            <p>{r.assignee ? t("assignedTo", { who: r.assignee.name }) : t("nobody")}</p>
            {working ? (
              <>
                {r.assignee?.id !== me || r.status === "OPEN" ? (
                  <Button variant="primary" loading={busy} onClick={() => post("take")}>
                    {t("take")}
                  </Button>
                ) : null}
                <Field label={t("giveTo")}>
                  <select className={input} value={r.assignee?.id ?? ""} onChange={(e) => post("assign", { assigneeId: e.target.value || null })}>
                    <option value="">{t("nobody")}</option>
                    {officers.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </Field>
              </>
            ) : null}
          </section>
          {working ? (
            <form
              className={`${box} grid gap-3`}
              onSubmit={(e: FormEvent) => {
                e.preventDefault();
              }}
            >
              <Field label={t("resolution")} required hint={t("resolutionHint")}>
                <textarea className={`${input} h-auto py-2`} rows={3} maxLength={1000} value={resolution} onChange={(e) => setResolution(e.target.value)} />
              </Field>
              <Button variant="primary" loading={busy} disabled={resolution.trim().length < 3} onClick={() => post("resolve", { outcome: "RESOLVED", resolution: resolution.trim() })}>
                {t("resolve")}
              </Button>
              <Button variant="secondary" loading={busy} disabled={resolution.trim().length < 3} onClick={() => post("resolve", { outcome: "DISMISSED", resolution: resolution.trim() })}>
                {t("dismiss")}
              </Button>
            </form>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

interface HsView {
  product: { id: string; title: Text; brand: string | null; category: { slug: string; name: Text }[] };
  hsCode: string | null;
  confirmed: { by: string | null; at: string } | null;
  categoryHeading: { code: string; category: string } | null;
  suggestions: { id: string; code: string; description: string | null; source: "CATEGORY" | "SIMILAR" | "AI"; confidence: string; rationale: string | null; model: string | null; status: "SUGGESTED" | "ACCEPTED" | "REJECTED"; createdAt: string }[];
  note?: string | null;
}

/** A product's customs code: confirmed by a person, or suggested and not binding. */
export function HsPanel({ productId, onConfirmed }: { productId: string; onConfirmed?: () => void }) {
  const t = useTranslations("customs.hs");
  const locale = useLocale();
  const format = useFormat();
  const [h, setH] = useState<HsView | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    call<HsView>("GET", `/customs/products/${productId}/hs`).then(setH, (e) => setError((e as Error).message));
  }, [productId]);

  async function run(fn: () => Promise<HsView>, confirms = false) {
    setBusy(true);
    setError(null);
    try {
      setH(await fn());
      if (confirms) onConfirmed?.();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!h) return error ? <p className="text-critical">{error}</p> : null;
  return (
    <section className={`${box} grid gap-3`} aria-labelledby="hs-panel">
      <h2 id="hs-panel" className="rb-title">
        {t("title")}
      </h2>
      <p className="text-ink-muted">
        {h.product.category
          .map((c) => pick(c.name, locale))
          .reverse()
          .join(" › ")}
        {h.product.brand ? ` · ${h.product.brand}` : ""}
      </p>
      {h.hsCode ? (
        <p>
          <span className="rb-mono text-lg font-semibold">{h.hsCode}</span> <Badge variant="positive">{t("confirmed")}</Badge>
          {h.confirmed ? <span className="block text-xs text-ink-muted">{t("confirmedBy", { who: h.confirmed.by ?? "—", date: format.date(h.confirmed.at) })}</span> : null}
        </p>
      ) : (
        <p className="font-medium">{t("noCode")}</p>
      )}
      <p className="rounded-[var(--radius-s)] bg-surface-sunken px-3 py-2 text-xs">{t("notBinding")}</p>
      {h.suggestions.length ? (
        <ul className="divide-y divide-line">
          {h.suggestions.map((s) => (
            <li key={s.id} className="flex flex-col gap-1 py-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rb-mono font-medium">{s.code}</span>
                <Badge variant="default">{t(`sources.${s.source}`)}</Badge>
                <Badge variant="attn">{t("suggestion")}</Badge>
                <span className="text-xs text-ink-muted">{t("confidence", { level: s.confidence })}</span>
                {s.status !== "SUGGESTED" ? <Badge variant={s.status === "ACCEPTED" ? "positive" : "default"}>{t(`statuses.${s.status}`)}</Badge> : null}
              </div>
              {s.description ? <p>{s.description}</p> : null}
              {s.rationale ? <p className="text-ink-muted">{s.rationale}</p> : null}
              {s.status === "SUGGESTED" ? (
                <div className="flex gap-3">
                  <Button variant="secondary" loading={busy} aria-label={t("confirmOne", { code: s.code })} onClick={() => run(() => call("POST", `/customs/hs-suggestions/${s.id}/accept`), true)}>
                    {t("confirm")}
                  </Button>
                  <button type="button" className="underline" onClick={() => run(() => call("POST", `/customs/hs-suggestions/${s.id}/reject`))}>
                    {t("reject")}
                  </button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {h.note ? <p className="text-ink-muted">{h.note}</p> : null}
      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" loading={busy} onClick={() => run(() => call("POST", `/customs/products/${productId}/hs-suggestions`, {}))}>
          {t("suggest")}
        </Button>
        <Button variant="secondary" loading={busy} onClick={() => run(() => call("POST", `/customs/products/${productId}/hs-suggestions`, { useAi: true }))}>
          {t("askAi")}
        </Button>
      </div>
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          run(() => call("PUT", `/customs/products/${productId}/hs-code`, { code: code.trim() }), true);
        }}
      >
        <Field label={t("enter")}>
          <input className={`${input} rb-mono w-40`} placeholder="8467.21" value={code} onChange={(e) => setCode(e.target.value)} />
        </Field>
        <Button type="submit" variant="primary" loading={busy} disabled={code.trim().length < 4}>
          {t("confirmTyped")}
        </Button>
      </form>
      {error ? (
        <p role="alert" className="text-critical">
          {error}
        </p>
      ) : null}
    </section>
  );
}
