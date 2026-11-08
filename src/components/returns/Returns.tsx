"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useFormat } from "@/lib/format";
import { toMajor, toMinor } from "@/lib/currency";
import { Badge } from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { Field, input } from "@/components/ui/form/Form";
import { call } from "@/components/checkout/http";
import { ExportButton, QueueChip, SavedViews, useListFilters } from "@/components/console/ListTools";

const LIST_FILTERS = ["q", "status", "queue"] as const;

// Returns and refunds in the console (ADR-042). The API checks every call and
// scopes what it returns; amounts come only to those who see order prices.

export const RETURN_STATUSES = ["REQUESTED", "APPROVED", "REJECTED", "IN_TRANSIT", "RECEIVED", "INSPECTED", "CLOSED", "CANCELLED"] as const;
export type ReturnStatus = (typeof RETURN_STATUSES)[number];
export const RETURN_TONE: Record<ReturnStatus, "positive" | "attn" | "default" | "critical" | "info"> = {
  REQUESTED: "attn",
  APPROVED: "info",
  REJECTED: "critical",
  IN_TRANSIT: "info",
  RECEIVED: "attn",
  INSPECTED: "attn",
  CLOSED: "positive",
  CANCELLED: "default",
};

const box = "rounded-[var(--radius-m)] border border-line bg-surface-raised p-5 text-sm";

interface Row {
  id: string;
  reference: string;
  kind: "RETURN" | "WARRANTY";
  status: ReturnStatus;
  orderReference: string;
  warehouse: { code: string; city: string };
  lineCount: number;
  createdAt: string;
}

export function ReturnsList() {
  const t = useTranslations("returns");
  const format = useFormat();
  const { applied, query, apply } = useListFilters(LIST_FILTERS);
  const [q, setQ] = useState(applied.q);
  const status = applied.status;
  const [rows, setRows] = useState<Row[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (after: string | null, filters: string) => {
    const p = new URLSearchParams(filters);
    p.set("limit", "50");
    if (after) p.set("cursor", after);
    try {
      const res = await call<{ items: Row[]; nextCursor: string | null }>("GET", `/returns?${p}`);
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
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <SavedViews list="returns" query={query} onApply={apply} />
        <ExportButton path="/returns/export.csv" query={query} />
      </div>
      {applied.queue ? <QueueChip label={t(`queues.${applied.queue}` as "queues.toDecide")} onClear={() => apply({ ...applied, queue: "" })} /> : null}
      <form
        role="search"
        className="mb-4 flex flex-wrap gap-2"
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          apply({ ...applied, q });
        }}
      >
        <input className={`${input} max-w-sm`} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search")} aria-label={t("search")} />
        <select
          className={`${input} max-w-[14rem]`}
          value={status}
          aria-label={t("status")}
          onChange={(e) => apply({ ...applied, q, status: e.target.value })}
        >
          <option value="">{t("allStatuses")}</option>
          {RETURN_STATUSES.map((s) => (
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
              <th className="px-4 py-3 font-medium">{t("columns.return")}</th>
              <th className="px-4 py-3 font-medium">{t("columns.kind")}</th>
              <th className="px-4 py-3 font-medium">{t("columns.status")}</th>
              <th className="px-4 py-3 font-medium">{t("columns.warehouse")}</th>
              <th className="px-4 py-3 font-medium">{t("columns.requested")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-surface-sunken">
                <td className="px-4 py-3">
                  <Link href={`/returns/${r.id}`} className="rb-mono font-medium text-ink hover:underline">
                    {r.reference}
                  </Link>
                  <p className="text-xs text-ink-muted">{t("orderItems", { reference: r.orderReference, count: r.lineCount })}</p>
                </td>
                <td className="px-4 py-3">{t(`kinds.${r.kind}`)}</td>
                <td className="px-4 py-3">
                  <Badge variant={RETURN_TONE[r.status]}>{t(`statuses.${r.status}`)}</Badge>
                </td>
                <td className="px-4 py-3">{r.warehouse.city}</td>
                <td className="px-4 py-3 text-ink-muted">{format.shortDate(r.createdAt)}</td>
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

interface Detail {
  id: string;
  reference: string;
  kind: "RETURN" | "WARRANTY";
  status: ReturnStatus;
  orderId?: string;
  orderReference: string;
  customer: { name: string; email: string; phone: string | null };
  warehouse: { name: string; city: string };
  note: string | null;
  externalRef: string | null;
  decisionNote: string | null;
  resolution: "REFUND" | "REPAIR" | "REPLACE" | "DECLINED" | null;
  resolutionNote: string | null;
  lines: { orderLineId: string; sku: string; title: string; quantity: number; reason: string; note: string | null; condition: string | null; outcome: string | null }[];
  photos: { id: string }[];
  events: { id: string; status: ReturnStatus; note: string | null; createdAt: string }[];
  currency?: string;
  suggestedRefundMinor?: number;
  mostRefundableMinor?: number;
  refunds?: { id: string; status: string; amountMinor: number; currency: string; paidAt: string | null }[];
}

const CONDITIONS = ["AS_NEW", "OPENED", "DAMAGED", "DEFECTIVE"] as const;
const OUTCOMES = ["RESTOCK", "WRITE_OFF", "REPAIR"] as const;
const RESOLUTIONS = ["REFUND", "REPAIR", "REPLACE", "DECLINED"] as const;

/** One return: what came back and why and, for those who may, its next step. */
export function ReturnDetail({ id, canProcess, canReceive, canRefund, canSeeOrder }: { id: string; canProcess: boolean; canReceive: boolean; canRefund: boolean; canSeeOrder: boolean }) {
  const t = useTranslations("returns");
  const format = useFormat();
  const [r, setR] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [why, setWhy] = useState("");

  useEffect(() => {
    call<Detail>("GET", `/returns/${id}`)
      .then(setR)
      .catch((e) => setError((e as Error).message));
  }, [id]);

  if (error && !r) return <p className="text-critical">{error}</p>;
  if (!r) return <p className="text-ink-muted">…</p>;

  async function post(path: string, body?: unknown) {
    setBusy(true);
    setError(null);
    try {
      setR(await call<Detail>("POST", `/returns/${id}/${path}`, body));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const waitingOnRefund = r.status === "INSPECTED" && r.resolution === "REFUND";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/returns" className="text-sm text-ink-muted hover:text-ink">
          ← {t("title")}
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="rb-headline rb-mono text-[26px]">{r.reference}</h1>
          <Badge variant={RETURN_TONE[r.status]}>{t(`statuses.${r.status}`)}</Badge>
          <Badge variant="default">{t(`kinds.${r.kind}`)}</Badge>
        </div>
        <p className="mt-1 text-sm text-ink-muted">
          {canSeeOrder && r.orderId ? (
            <Link href={`/store-orders/${r.orderId}`} className="underline">
              {t("order", { reference: r.orderReference })}
            </Link>
          ) : (
            t("order", { reference: r.orderReference })
          )}
          {" · "}
          {r.customer.name} · {r.customer.email}
          {r.customer.phone ? ` · ${r.customer.phone}` : ""}
        </p>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-critical">
          {error}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <section className="flex flex-col gap-6">
          <div className={box}>
            <h2 className="rb-title mb-3">{t("items")}</h2>
            <ul className="divide-y divide-line">
              {r.lines.map((l) => (
                <li key={l.orderLineId} className="py-2">
                  {l.title} × {l.quantity}
                  <p className="rb-mono-s text-ink-muted">{l.sku}</p>
                  <p className="text-ink-muted">
                    {t(`reasons.${l.reason}` as "reasons.DEFECTIVE")}
                    {l.note ? ` · ${l.note}` : ""}
                  </p>
                  {l.condition && l.outcome ? (
                    <p>
                      {t(`conditions.${l.condition}` as "conditions.AS_NEW")} · {t(`outcomes.${l.outcome}` as "outcomes.RESTOCK")}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
            {r.note ? <p className="mt-3 border-t border-line pt-3">{r.note}</p> : null}
            {r.photos.length ? (
              <p className="mt-3 flex flex-wrap gap-3">
                {r.photos.map((p, i) => (
                  <a key={p.id} href={`/api/tracecart/returns/${r.id}/photos/${p.id}/file`} target="_blank" rel="noreferrer" className="underline">
                    {t("photo", { number: i + 1 })}
                  </a>
                ))}
              </p>
            ) : null}
          </div>
          <div className={box}>
            <h2 className="rb-title mb-3">{t("history")}</h2>
            <ol className="space-y-2">
              {[...r.events].reverse().map((e) => (
                <li key={e.id}>
                  <span className="font-medium">{t(`statuses.${e.status}`)}</span>
                  <span className="text-ink-muted"> · {format.dayTime(e.createdAt)}</span>
                  {e.note ? <p className="text-ink-muted">{e.note}</p> : null}
                </li>
              ))}
            </ol>
          </div>
        </section>

        <aside className="flex flex-col gap-4">
          <div className={box}>
            <h2 className="rb-label mb-2">{t("comesBackTo")}</h2>
            <p>
              {r.warehouse.name}, {r.warehouse.city}
            </p>
            {r.externalRef ? <p className="rb-mono-s mt-1 text-ink-muted">{r.externalRef}</p> : null}
            {r.resolution ? (
              <>
                <h2 className="rb-label mb-2 mt-4">{t("decision")}</h2>
                <p>{t(`resolutions.${r.resolution}`)}</p>
                {r.resolutionNote ? <p className="text-ink-muted">{r.resolutionNote}</p> : null}
              </>
            ) : null}
            {r.status === "REJECTED" && r.decisionNote ? <p className="mt-3 text-ink-muted">{r.decisionNote}</p> : null}
            {r.refunds?.length ? (
              <>
                <h2 className="rb-label mb-2 mt-4">{t("refunds")}</h2>
                <ul className="space-y-1">
                  {r.refunds.map((x) => (
                    <li key={x.id}>
                      <span className="rb-numeral">
                        {format.number(toMajor(x.amountMinor, x.currency))} {x.currency}
                      </span>{" "}
                      · {t(`refundStatuses.${x.status}` as "refundStatuses.PAID")}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </div>

          {canProcess && r.status === "REQUESTED" ? (
            <div className={`${box} grid gap-3`}>
              <Button variant="primary" loading={busy} onClick={() => post("approve")}>
                {t("approve")}
              </Button>
              <Field label={t("rejectReason")} hint={t("customerReads")}>
                <input className={input} maxLength={500} value={why} onChange={(e) => setWhy(e.target.value)} />
              </Field>
              <Button variant="secondary" loading={busy} disabled={why.trim().length < 3} onClick={() => post("reject", { reason: why.trim() })}>
                {t("reject")}
              </Button>
            </div>
          ) : null}
          {canProcess && r.status === "APPROVED" ? (
            <div className={box}>
              <Button variant="secondary" loading={busy} onClick={() => post("sent", {})}>
                {t("markSent")}
              </Button>
            </div>
          ) : null}
          {canReceive && (r.status === "APPROVED" || r.status === "IN_TRANSIT") ? (
            <div className={box}>
              <Button variant="primary" loading={busy} onClick={() => post("receive")}>
                {t("receive")}
              </Button>
            </div>
          ) : null}
          {canProcess && r.status === "RECEIVED" ? <InspectForm key={r.status} lines={r.lines} busy={busy} onInspect={(body) => post("inspect", body)} /> : null}
          {canRefund && r.status === "INSPECTED" && !waitingOnRefund ? <ResolveForm detail={r} busy={busy} onResolve={(body) => post("resolve", body)} /> : null}
          {waitingOnRefund ? <p className={`${box} text-ink-muted`}>{t("waitingOnRefund")}</p> : null}
        </aside>
      </div>
    </div>
  );
}

function InspectForm({ lines, busy, onInspect }: { lines: Detail["lines"]; busy: boolean; onInspect: (body: unknown) => void }) {
  const t = useTranslations("returns");
  const [found, setFound] = useState<Record<string, { condition: string; outcome: string }>>(() => Object.fromEntries(lines.map((l) => [l.orderLineId, { condition: "AS_NEW", outcome: "RESTOCK" }])));
  const set = (id: string, patch: Partial<{ condition: string; outcome: string }>) => setFound((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  return (
    <form
      className={`${box} grid gap-3`}
      onSubmit={(e) => {
        e.preventDefault();
        onInspect({ lines: lines.map((l) => ({ orderLineId: l.orderLineId, ...found[l.orderLineId] })) });
      }}
    >
      <h2 className="rb-label">{t("inspect")}</h2>
      <p className="text-ink-muted">{t("inspectHint")}</p>
      {lines.map((l) => (
        <fieldset key={l.orderLineId} className="grid gap-2">
          <legend className="font-medium">{l.title}</legend>
          <Field label={t("condition")} required>
            <select className={input} value={found[l.orderLineId].condition} onChange={(e) => set(l.orderLineId, { condition: e.target.value })}>
              {CONDITIONS.map((c) => (
                <option key={c} value={c}>
                  {t(`conditions.${c}`)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("outcome")} required>
            <select className={input} value={found[l.orderLineId].outcome} onChange={(e) => set(l.orderLineId, { outcome: e.target.value })}>
              {OUTCOMES.map((o) => (
                <option key={o} value={o}>
                  {t(`outcomes.${o}`)}
                </option>
              ))}
            </select>
          </Field>
        </fieldset>
      ))}
      <Button type="submit" variant="primary" loading={busy}>
        {t("inspectCta")}
      </Button>
    </form>
  );
}

function ResolveForm({ detail, busy, onResolve }: { detail: Detail; busy: boolean; onResolve: (body: unknown) => void }) {
  const t = useTranslations("returns");
  const format = useFormat();
  const currency = detail.currency ?? "";
  const [resolution, setResolution] = useState<(typeof RESOLUTIONS)[number]>("REFUND");
  const [amount, setAmount] = useState(() => (detail.suggestedRefundMinor != null ? String(toMajor(detail.suggestedRefundMinor, currency)) : ""));
  const [note, setNote] = useState("");
  const refundMinor = toMinor(amount, currency);
  return (
    <form
      className={`${box} grid gap-3`}
      onSubmit={(e) => {
        e.preventDefault();
        onResolve({ resolution, ...(resolution === "REFUND" && refundMinor != null ? { refundMinor } : {}), ...(note.trim() ? { note: note.trim() } : {}) });
      }}
    >
      <h2 className="rb-label">{t("decide")}</h2>
      <Field label={t("decision")} required>
        <select className={input} value={resolution} onChange={(e) => setResolution(e.target.value as (typeof RESOLUTIONS)[number])}>
          {RESOLUTIONS.map((x) => (
            <option key={x} value={x}>
              {t(`resolutions.${x}`)}
            </option>
          ))}
        </select>
      </Field>
      {resolution === "REFUND" ? (
        <Field label={t("refundAmount", { currency })} required hint={detail.mostRefundableMinor != null ? t("refundMost", { amount: `${format.number(toMajor(detail.mostRefundableMinor, currency))} ${currency}` }) : undefined}>
          <input className={input} inputMode="decimal" required value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
      ) : null}
      <Field label={t("decisionNote")} required={resolution === "DECLINED"} hint={resolution === "DECLINED" ? t("customerReads") : undefined}>
        <input className={input} maxLength={500} required={resolution === "DECLINED"} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <Button type="submit" variant="primary" loading={busy}>
        {t("decideCta")}
      </Button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Refunds

interface RefundRow {
  id: string;
  status: "PENDING_APPROVAL" | "APPROVED" | "PAID" | "REJECTED";
  amountMinor: number;
  currency: string;
  reason: string;
  orderId: string;
  orderReference: string;
  customer: { name: string; email: string };
  method: string;
  returnRequest: { id: string; reference: string } | null;
  approvalRequestId: string | null;
  requestedByUserId: string;
  payoutRef: string | null;
  creditNoteNumber: string | null;
  createdAt: string;
}

const REFUND_TONE: Record<RefundRow["status"], "attn" | "info" | "positive" | "critical"> = { PENDING_APPROVAL: "attn", APPROVED: "info", PAID: "positive", REJECTED: "critical" };

/** Refunds for finance: those waiting for a second person, those to pay out, and those done. */
export function RefundsList({ userId, canPay, canApprove }: { userId: string; canPay: boolean; canApprove: boolean }) {
  const t = useTranslations("returns");
  const format = useFormat();
  const [status, setStatus] = useState("");
  const [rows, setRows] = useState<RefundRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [refs, setRefs] = useState<Record<string, string>>({});

  const load = useCallback(async (st: string) => {
    const res = await call<{ items: RefundRow[] }>("GET", `/refunds?limit=100${st ? `&status=${st}` : ""}`);
    setRows(res.items);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load("").catch((e) => setError((e as Error).message));
  }, [load]);

  async function act(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await load(status);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="rb-headline mb-1 text-[28px]">{t("refundsTitle")}</h1>
      <p className="mb-6 text-sm text-ink-muted">{t("refundsLead")}</p>
      <select
        className={`${input} mb-4 max-w-[16rem]`}
        value={status}
        aria-label={t("status")}
        onChange={(e) => {
          setStatus(e.target.value);
          load(e.target.value).catch((err) => setError((err as Error).message));
        }}
      >
        <option value="">{t("allStatuses")}</option>
        {(["PENDING_APPROVAL", "APPROVED", "PAID", "REJECTED"] as const).map((s) => (
          <option key={s} value={s}>
            {t(`refundStatuses.${s}`)}
          </option>
        ))}
      </select>
      {error ? (
        <p role="alert" className="mb-4 text-sm text-critical">
          {error}
        </p>
      ) : null}
      {rows.length ? (
        <ul className="grid gap-3">
          {rows.map((r) => (
            <li key={r.id} className={box}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="rb-numeral text-[18px]">
                  {format.number(toMajor(r.amountMinor, r.currency))} {r.currency}
                </p>
                <Badge variant={REFUND_TONE[r.status]}>{t(`refundStatuses.${r.status}`)}</Badge>
              </div>
              <p className="mt-1">
                <Link href={`/store-orders/${r.orderId}`} className="rb-mono-s underline">
                  {r.orderReference}
                </Link>
                {r.returnRequest ? (
                  <>
                    {" · "}
                    <Link href={`/returns/${r.returnRequest.id}`} className="rb-mono-s underline">
                      {r.returnRequest.reference}
                    </Link>
                  </>
                ) : null}
                <span className="text-ink-muted"> · {r.customer.name} · {format.shortDate(r.createdAt)}</span>
              </p>
              <p className="text-ink-muted">{r.reason}</p>
              {r.payoutRef ? <p className="rb-mono-s mt-1 text-ink-muted">{r.payoutRef}</p> : null}
              {r.creditNoteNumber ? (
                <a href={`/api/tracecart/refunds/${r.id}/credit-note.pdf`} className="mt-2 inline-block font-medium underline">
                  {t("creditNote", { number: r.creditNoteNumber })}
                </a>
              ) : null}
              {canApprove && r.status === "PENDING_APPROVAL" && r.approvalRequestId ? (
                r.requestedByUserId === userId ? (
                  <p className="mt-3 text-ink-muted">{t("someoneElse")}</p>
                ) : (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button variant="primary" loading={busy} onClick={() => act(() => call("POST", `/approvals/${r.approvalRequestId}/decision`, { decision: "APPROVE" }))}>
                      {t("approveRefund")}
                    </Button>
                    <Button variant="secondary" loading={busy} onClick={() => act(() => call("POST", `/approvals/${r.approvalRequestId}/decision`, { decision: "REJECT" }))}>
                      {t("rejectRefund")}
                    </Button>
                  </div>
                )
              ) : null}
              {canPay && r.status === "APPROVED" ? (
                <form
                  className="mt-3 grid max-w-md gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    act(() => call("POST", `/refunds/${r.id}/paid`, { payoutRef: (refs[r.id] ?? "").trim() }));
                  }}
                >
                  <Field label={t("payoutRef")} required hint={t("payoutHint")}>
                    <input className={input} required maxLength={120} value={refs[r.id] ?? ""} onChange={(e) => setRefs((prev) => ({ ...prev, [r.id]: e.target.value }))} />
                  </Field>
                  <Button type="submit" variant="primary" loading={busy}>
                    {t("markPaid")}
                  </Button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      ) : !error ? (
        <p className="text-ink-muted">{t("noRefunds")}</p>
      ) : null}
    </div>
  );
}

/** An order's refunds in the console, and asking for one with no return behind it. */
export function OrderRefunds({ orderId, currency, canRefund }: { orderId: string; currency: string; canRefund: boolean }) {
  const t = useTranslations("returns");
  const format = useFormat();
  const [state, setState] = useState<{ refunds: RefundRow[]; refundableMinor: number } | null>(null);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setState(await call<{ refunds: RefundRow[]; refundableMinor: number }>("GET", `/store-orders/${orderId}/refunds`));
  }, [orderId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load().catch(() => undefined);
  }, [load]);

  if (!state || (!state.refunds.length && !(canRefund && state.refundableMinor > 0))) return null;
  const money = (minor: number) => `${format.number(toMajor(minor, currency))} ${currency}`;
  const amountMinor = toMinor(amount, currency);

  return (
    <div className={box}>
      <h2 className="rb-label mb-2">{t("refunds")}</h2>
      {state.refunds.length ? (
        <ul className="mb-3 space-y-1">
          {state.refunds.map((r) => (
            <li key={r.id}>
              <span className="rb-numeral">{money(r.amountMinor)}</span> · {t(`refundStatuses.${r.status}`)}
              {r.creditNoteNumber ? (
                <a href={`/api/tracecart/refunds/${r.id}/credit-note.pdf`} className="ml-2 underline">
                  {r.creditNoteNumber}
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {canRefund && state.refundableMinor > 0 ? (
        <form
          className="grid gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError(null);
            try {
              await call("POST", `/store-orders/${orderId}/refunds`, { amountMinor, reason: reason.trim() }, { "Idempotency-Key": crypto.randomUUID() });
              setAmount("");
              setReason("");
              await load();
            } catch (err) {
              setError((err as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <p className="text-ink-muted">{t("refundable", { amount: money(state.refundableMinor) })}</p>
          {error ? <p className="text-critical">{error}</p> : null}
          <Field label={t("refundAmount", { currency })} required>
            <input className={input} inputMode="decimal" required value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
          <Field label={t("refundReason")} required>
            <input className={input} required minLength={3} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
          <Button type="submit" variant="secondary" loading={busy} disabled={amountMinor == null || amountMinor <= 0}>
            {t("askRefund")}
          </Button>
        </form>
      ) : null}
    </div>
  );
}
