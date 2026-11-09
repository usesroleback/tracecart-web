"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useFormat } from "@/lib/format";
import { toMajor, toMinor } from "@/lib/currency";
import { Badge } from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { Field, input } from "@/components/ui/form/Form";
import { call } from "@/components/checkout/http";

// Finance's workspace (ADR-092). Every figure comes from the API; the browser
// decides nothing about what is owed or payable.

const box = "rounded-[var(--radius-m)] border border-line bg-surface-raised p-5 text-sm";
const th = "py-2 pr-3 font-medium";

function useMoney() {
  const format = useFormat();
  return (minor: number, currency: string) => `${format.number(toMajor(minor, currency))} ${currency}`;
}

function useLoad<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(async () => {
    try {
      setError(null);
      setData(await call<T>("GET", path));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [path]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload();
  }, [reload]);
  return { data, error, reload, setError };
}

function Heading({ title, lead }: { title: string; lead: string }) {
  return (
    <div className="mb-5">
      <h1 className="rb-headline mb-1 text-[28px]">{title}</h1>
      <p className="text-sm text-ink-muted">{lead}</p>
    </div>
  );
}

function State({ error, empty, loading }: { error?: string | null; empty?: string | null; loading?: boolean }) {
  const t = useTranslations("finance");
  if (error) return <p role="alert" className="mb-3 text-sm text-critical">{error}</p>;
  if (loading) return <p className="text-sm text-ink-muted">{t("loading")}</p>;
  return empty ? <p className="text-sm text-ink-muted">{empty}</p> : null;
}

interface Overview {
  currencies: Record<string, number | string>[];
  queues: Record<string, number>;
}

const GROUPS: [string, string[]][] = [
  ["activity", ["gmvMinor"]],
  ["revenue", ["commissionRevenueMinor", "salesRevenueMinor", "logisticsRevenueMinor", "carrierCostsMinor", "refundsMinor", "codWriteOffsMinor", "contributionMarginMinor"]],
  ["cash", ["providerClearingMinor", "cashMinor", "codOutstandingMinor"]],
  ["liabilities", ["sellerPayableMinor", "carrierPayableMinor", "dutiesTaxesPayableMinor"]],
];

// Message keys can't hold dots (next-intl nests on them): payment.captured is kinds.payment_captured.
const kindKey = (kind: string) => kind.replace(/\./g, "_");

export function FinanceOverview() {
  const t = useTranslations("finance");
  const money = useMoney();
  const { data, error } = useLoad<Overview>("/finance/overview");
  return (
    <div className="max-w-5xl">
      <Heading title={t("overview.title")} lead={t("overview.lead")} />
      <State error={error} loading={!data && !error} empty={data && !data.currencies.length ? t("overview.empty") : null} />
      {data?.currencies.map((c) => (
        <section key={String(c.currency)} className="mb-6">
          <h2 className="rb-title mb-3">{String(c.currency)}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {GROUPS.map(([group, keys]) => (
              <div key={group} className={box}>
                <h3 className="rb-label mb-2">{t(`overview.groups.${group}`)}</h3>
                <dl className="grid gap-1">
                  {keys.map((k) => (
                    <div key={k} className="flex justify-between gap-3">
                      <dt className="text-ink-muted">{t(`overview.figures.${k}`)}</dt>
                      <dd className="rb-numeral">{money(Number(c[k]), String(c.currency))}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        </section>
      ))}
      {data ? (
        <section className={box}>
          <h2 className="rb-title mb-3">{t("overview.queuesTitle")}</h2>
          <dl className="grid gap-1 md:grid-cols-2 md:gap-x-8">
            {Object.entries(data.queues).map(([k, n]) => (
              <div key={k} className="flex justify-between gap-3">
                <dt className="text-ink-muted">{t(`overview.queues.${k}`)}</dt>
                <dd className="rb-numeral">{n}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}
    </div>
  );
}

interface LedgerRow {
  id: string;
  kind: string;
  sourceType: string;
  sourceId: string;
  currency: string;
  memo: string | null;
  postedAt: string;
  entries: { id: string; account: string; debitMinor: number; creditMinor: number; organization: { name: string } | null }[];
}

const ACCOUNTS = ["PROVIDER_CLEARING", "CASH", "COD_RECEIVABLE", "ORDER_CLEARING", "GIFT_CARD_LIABILITY", "SELLER_PAYABLE", "CARRIER_PAYABLE", "DUTIES_TAXES_PAYABLE", "COMMISSION_REVENUE", "SALES_REVENUE", "LOGISTICS_REVENUE", "CARRIER_COST", "REFUNDS", "COD_WRITE_OFF"];

export function LedgerExplorer() {
  const t = useTranslations("finance");
  const format = useFormat();
  const money = useMoney();
  const [account, setAccount] = useState("");
  const [extra, setExtra] = useState<LedgerRow[]>([]);
  const [cursor, setCursor] = useState<string | null | undefined>(undefined);
  const { data, error } = useLoad<{ items: LedgerRow[]; nextCursor: string | null }>(`/finance/ledger?limit=50${account ? `&account=${account}` : ""}`);
  const next = cursor === undefined ? data?.nextCursor : cursor;
  const rows = [...(data?.items ?? []), ...extra];

  async function more() {
    const page = await call<{ items: LedgerRow[]; nextCursor: string | null }>("GET", `/finance/ledger?limit=50&cursor=${next}${account ? `&account=${account}` : ""}`);
    setExtra([...extra, ...page.items]);
    setCursor(page.nextCursor);
  }

  return (
    <div className="max-w-5xl">
      <Heading title={t("ledger.title")} lead={t("ledger.lead")} />
      <div className="mb-4 max-w-xs">
        <Field label={t("ledger.account")}>
          <select
            className={input}
            value={account}
            onChange={(e) => {
              setAccount(e.target.value);
              setExtra([]);
              setCursor(undefined);
            }}
          >
            <option value="">{t("ledger.allAccounts")}</option>
            {ACCOUNTS.map((a) => (
              <option key={a} value={a}>
                {t(`accounts.${a}`)}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <State error={error} loading={!data && !error} empty={data && !rows.length ? t("ledger.empty") : null} />
      <div className="flex flex-col gap-3">
        {rows.map((r) => (
          <article key={r.id} className={box}>
            <div className="mb-2 flex flex-wrap justify-between gap-2">
              <p className="font-medium">{t.has(`kinds.${kindKey(r.kind)}`) ? t(`kinds.${kindKey(r.kind)}`) : r.kind}</p>
              <p className="text-ink-muted">{format.dayTime(r.postedAt)}</p>
            </div>
            <p className="rb-mono-s mb-2 text-ink-muted">
              {r.sourceType} · {r.sourceId}
            </p>
            {r.memo ? <p className="mb-2">{r.memo}</p> : null}
            <table className="w-full text-left">
              <thead className="text-ink-muted">
                <tr>
                  <th className={th}>{t("ledger.account")}</th>
                  <th className={`${th} text-right`}>{t("ledger.debit")}</th>
                  <th className={`${th} text-right`}>{t("ledger.credit")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {r.entries.map((e) => (
                  <tr key={e.id}>
                    <td className="py-1 pr-3">
                      {t(`accounts.${e.account}`)}
                      {e.organization ? <span className="text-ink-muted"> · {e.organization.name}</span> : null}
                    </td>
                    <td className="rb-numeral py-1 text-right">{e.debitMinor ? money(e.debitMinor, r.currency) : ""}</td>
                    <td className="rb-numeral py-1 text-right">{e.creditMinor ? money(e.creditMinor, r.currency) : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </article>
        ))}
      </div>
      {next ? (
        <Button variant="secondary" className="mt-4" onClick={() => void more()}>
          {t("more")}
        </Button>
      ) : null}
    </div>
  );
}

interface Line {
  id: string;
  orderReference: string;
  seller: { name: string } | null;
  sku: string;
  currency: string;
  itemMinor: number;
  commissionMinor: number;
  dueMinor: number;
  state: string;
  reasons: string[];
  eligibleAt: string | null;
  payoutReference: string | null;
}

const STATES = ["NOT_ELIGIBLE", "PENDING_RECONCILIATION", "ON_HOLD", "ELIGIBLE", "BATCHED", "PAYOUT_PENDING", "PAID", "FAILED", "REVERSED"];
const TONE: Record<string, "default" | "info" | "attn" | "positive" | "critical"> = { NOT_ELIGIBLE: "default", PENDING_RECONCILIATION: "attn", ON_HOLD: "attn", ELIGIBLE: "info", BATCHED: "info", PAYOUT_PENDING: "info", PAID: "positive", FAILED: "critical", REVERSED: "default" };

export function SettlementLines({ items, showSeller }: { items: Line[]; showSeller: boolean }) {
  const t = useTranslations("finance");
  const format = useFormat();
  const money = useMoney();
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="text-ink-muted">
          <tr>
            <th className={th}>{t("lines.order")}</th>
            {showSeller ? <th className={th}>{t("lines.seller")}</th> : null}
            <th className={`${th} text-right`}>{t("lines.sale")}</th>
            <th className={`${th} text-right`}>{t("lines.commission")}</th>
            <th className={`${th} text-right`}>{t("lines.due")}</th>
            <th className={th}>{t("lines.state")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {items.map((l) => (
            <tr key={l.id}>
              <td className="rb-mono-s py-2 pr-3">{l.orderReference}</td>
              {showSeller ? <td className="py-2 pr-3">{l.seller?.name}</td> : null}
              <td className="rb-numeral py-2 pr-3 text-right">{money(l.itemMinor, l.currency)}</td>
              <td className="rb-numeral py-2 pr-3 text-right">{money(l.commissionMinor, l.currency)}</td>
              <td className="rb-numeral py-2 pr-3 text-right">{money(l.dueMinor, l.currency)}</td>
              <td className="py-2">
                <Badge variant={TONE[l.state]}>{t(`states.${l.state}`)}</Badge>
                {l.reasons.map((r) => (
                  <p key={r} className="mt-1 text-ink-muted">
                    {t(`reasons.${r}`)}
                    {r === "HOLD_PERIOD" && l.eligibleAt ? ` ${format.shortDate(l.eligibleAt)}` : ""}
                  </p>
                ))}
                {l.payoutReference ? <p className="rb-mono-s mt-1 text-ink-muted">{l.payoutReference}</p> : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SettlementEligibility() {
  const t = useTranslations("finance");
  const [state, setState] = useState("");
  const { data, error } = useLoad<{ items: Line[] }>(`/finance/settlement-eligibility${state ? `?state=${state}` : ""}`);
  return (
    <div className="max-w-5xl">
      <Heading title={t("eligibility.title")} lead={t("eligibility.lead")} />
      <div className="mb-4 max-w-xs">
        <Field label={t("lines.state")}>
          <select className={input} value={state} onChange={(e) => setState(e.target.value)}>
            <option value="">{t("eligibility.allStates")}</option>
            {STATES.map((s) => (
              <option key={s} value={s}>
                {t(`states.${s}`)}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <State error={error} loading={!data && !error} empty={data && !data.items.length ? t("eligibility.empty") : null} />
      {data?.items.length ? (
        <div className={box}>
          <SettlementLines items={data.items} showSeller />
        </div>
      ) : null}
    </div>
  );
}

interface Payable {
  id: string;
  shipmentReference: string;
  deliveredAt: string | null;
  carrier: { id: string; name: string };
  amountMinor: number;
  currency: string;
  status: "OPEN" | "DISPUTED" | "BATCHED" | "PAID";
  disputeNote: string | null;
}

interface Settlement {
  id: string;
  reference: string;
  carrier: { name: string };
  amountMinor: number;
  currency: string;
  status: "PENDING_APPROVAL" | "APPROVED" | "PAID" | "FAILED";
  carrierInvoiceRef: string | null;
  paymentRef: string | null;
  failedReason: string | null;
  requestedByMe?: boolean;
  payables: { id: string }[];
}

const PAY_TONE = { OPEN: "attn", DISPUTED: "critical", BATCHED: "info", PAID: "positive", PENDING_APPROVAL: "attn", APPROVED: "info", FAILED: "critical" } as const;

export function CarrierPayables({ canReconcile, canApprove }: { canReconcile: boolean; canApprove: boolean }) {
  const t = useTranslations("finance");
  const format = useFormat();
  const money = useMoney();
  const payables = useLoad<{ items: Payable[] }>("/finance/carrier-payables");
  const settlements = useLoad<{ items: Settlement[] }>("/finance/carrier-settlements");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [invoice, setInvoice] = useState("");
  const [refs, setRefs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function act(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await Promise.all([payables.reload(), settlements.reload()]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const items = payables.data?.items ?? [];
  const chosen = items.filter((p) => picked.has(p.id));

  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <Heading title={t("carriers.title")} lead={t("carriers.lead")} />
      <State error={error ?? payables.error ?? settlements.error} />
      <section className={box}>
        <h2 className="rb-title mb-3">{t("carriers.payables")}</h2>
        {payables.data && !items.length ? <p className="text-ink-muted">{t("carriers.noPayables")}</p> : null}
        {items.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="text-ink-muted">
                <tr>
                  {canReconcile ? <th className={th} aria-label={t("carriers.pick")} /> : null}
                  <th className={th}>{t("carriers.shipment")}</th>
                  <th className={th}>{t("carriers.carrier")}</th>
                  <th className={th}>{t("carriers.delivered")}</th>
                  <th className={`${th} text-right`}>{t("carriers.amount")}</th>
                  <th className={th}>{t("lines.state")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {items.map((p) => (
                  <tr key={p.id}>
                    {canReconcile ? (
                      <td className="py-2 pr-2">
                        {p.status === "OPEN" ? (
                          <input
                            type="checkbox"
                            aria-label={t("carriers.pickOne", { reference: p.shipmentReference })}
                            checked={picked.has(p.id)}
                            onChange={(e) => {
                              const next = new Set(picked);
                              if (e.target.checked) next.add(p.id);
                              else next.delete(p.id);
                              setPicked(next);
                            }}
                          />
                        ) : null}
                      </td>
                    ) : null}
                    <td className="rb-mono-s py-2 pr-3">{p.shipmentReference}</td>
                    <td className="py-2 pr-3">{p.carrier.name}</td>
                    <td className="py-2 pr-3 text-ink-muted">{p.deliveredAt ? format.shortDate(p.deliveredAt) : ""}</td>
                    <td className="rb-numeral py-2 pr-3 text-right">{money(p.amountMinor, p.currency)}</td>
                    <td className="py-2">
                      <Badge variant={PAY_TONE[p.status]}>{t(`payable.${p.status}`)}</Badge>
                      {p.disputeNote ? <p className="mt-1 text-ink-muted">{p.disputeNote}</p> : null}
                      {canReconcile && p.status === "DISPUTED" ? (
                        <button className="mt-1 block underline" disabled={busy} onClick={() => act(() => call("POST", `/finance/carrier-payables/${p.id}/reopen`))}>
                          {t("carriers.reopen")}
                        </button>
                      ) : null}
                      {canReconcile && p.status === "OPEN" ? (
                        <button
                          className="mt-1 block underline"
                          disabled={busy || (refs[p.id] ?? "").trim().length < 3}
                          onClick={() => act(() => call("POST", `/finance/carrier-payables/${p.id}/dispute`, { note: refs[p.id].trim() }))}
                        >
                          {t("carriers.dispute")}
                        </button>
                      ) : null}
                      {canReconcile && p.status === "OPEN" ? <input className={`${input} mt-1`} aria-label={t("carriers.disputeNote")} placeholder={t("carriers.disputeNote")} maxLength={500} value={refs[p.id] ?? ""} onChange={(e) => setRefs({ ...refs, [p.id]: e.target.value })} /> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        {canReconcile && chosen.length ? (
          <div className="mt-4 grid max-w-md gap-3">
            <Field label={t("carriers.invoice")}>
              <input className={input} maxLength={120} value={invoice} onChange={(e) => setInvoice(e.target.value)} />
            </Field>
            <Button
              variant="primary"
              loading={busy}
              onClick={() =>
                act(async () => {
                  await call("POST", "/finance/carrier-settlements", { payableIds: chosen.map((c) => c.id), ...(invoice.trim() ? { carrierInvoiceRef: invoice.trim() } : {}) });
                  setPicked(new Set());
                  setInvoice("");
                })
              }
            >
              {t("carriers.prepare", { count: chosen.length })}
            </Button>
          </div>
        ) : null}
      </section>

      <section className={box}>
        <h2 className="rb-title mb-3">{t("carriers.settlements")}</h2>
        {settlements.data && !settlements.data.items.length ? <p className="text-ink-muted">{t("carriers.noSettlements")}</p> : null}
        <ul className="divide-y divide-line">
          {settlements.data?.items.map((s) => (
            <li key={s.id} className="py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p>
                  <span className="rb-mono-s font-medium">{s.reference}</span>
                  <span className="text-ink-muted"> · {s.carrier.name} · {s.payables.length}</span>
                </p>
                <Badge variant={PAY_TONE[s.status]}>{t(`settlement.${s.status}`)}</Badge>
              </div>
              <p className="rb-numeral mt-1">{money(s.amountMinor, s.currency)}</p>
              {s.paymentRef ? <p className="text-ink-muted">{s.paymentRef}</p> : null}
              {s.failedReason ? <p className="text-critical">{s.failedReason}</p> : null}
              {canApprove && s.status === "PENDING_APPROVAL" ? (
                s.requestedByMe ? (
                  <p className="mt-2 text-ink-muted">{t("carriers.needsSecond")}</p>
                ) : (
                  <Button className="mt-2" variant="primary" loading={busy} onClick={() => act(() => call("POST", `/finance/carrier-settlements/${s.id}/approve`))}>
                    {t("carriers.approve")}
                  </Button>
                )
              ) : null}
              {canReconcile && (s.status === "APPROVED" || s.status === "FAILED") ? (
                <div className="mt-3 grid max-w-md gap-2">
                  <Field label={t("carriers.paymentRef")}>
                    <input className={input} maxLength={120} value={refs[s.id] ?? ""} onChange={(e) => setRefs({ ...refs, [s.id]: e.target.value })} />
                  </Field>
                  <Button variant="primary" loading={busy} disabled={(refs[s.id] ?? "").trim().length < 2} onClick={() => act(() => call("POST", `/finance/carrier-settlements/${s.id}/paid`, { paymentRef: refs[s.id].trim() }))}>
                    {t("carriers.markPaid")}
                  </Button>
                  {s.status === "APPROVED" ? (
                    <Button variant="secondary" loading={busy} disabled={(refs[s.id] ?? "").trim().length < 3} onClick={() => act(() => call("POST", `/finance/carrier-settlements/${s.id}/failed`, { reason: refs[s.id].trim() }))}>
                      {t("carriers.markFailed")}
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

const BUCKETS = ["pending", "held", "eligible", "inSettlement", "paid", "reversed", "failed"];

/** A seller's own money. Read only: nothing here can change it. */
export function SellerFinance() {
  const t = useTranslations("finance");
  const money = useMoney();
  const { data, error } = useLoad<{ balances: Record<string, number | string>[]; items: Line[] }>("/seller/finance");
  return (
    <div className="max-w-5xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Heading title={t("seller.title")} lead={t("seller.lead")} />
        <a href="/api/tracecart/seller/finance/statement.csv" className="text-sm font-medium underline">
          {t("seller.statement")}
        </a>
      </div>
      <State error={error} loading={!data && !error} empty={data && !data.items.length ? t("seller.empty") : null} />
      {data?.balances.map((b) => (
        <dl key={String(b.currency)} className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          {BUCKETS.map((k) => (
            <div key={k} className={box}>
              <dt className="rb-label">{t(`seller.buckets.${k}`)}</dt>
              <dd className="rb-numeral text-lg">{money(Number(b[k]), String(b.currency))}</dd>
            </div>
          ))}
        </dl>
      ))}
      {data?.items.length ? (
        <div className={box}>
          <SettlementLines items={data.items} showSeller={false} />
        </div>
      ) : null}
    </div>
  );
}

/** A carrier's own money: what it's owed, kept apart from the cash it holds for Tracecart. */
export function CarrierFinance() {
  const t = useTranslations("finance");
  const format = useFormat();
  const money = useMoney();
  const { data, error } = useLoad<{ owedToYou: { currency: string; amountMinor: number }[]; cashHeld: { currency: string; amountMinor: number }[]; payables: Payable[]; settlements: Settlement[] }>("/partner/finance");
  return (
    <div className="max-w-4xl">
      <Heading title={t("partner.title")} lead={t("partner.lead")} />
      <State error={error} loading={!data && !error} />
      {data ? (
        <div className="flex flex-col gap-5">
          <div className="grid gap-3 md:grid-cols-2">
            <div className={box}>
              <h2 className="rb-label">{t("partner.owed")}</h2>
              <p className="rb-numeral text-lg">{data.owedToYou.map((o) => money(o.amountMinor, o.currency)).join(" + ") || "0"}</p>
            </div>
            <div className={box}>
              <h2 className="rb-label">{t("partner.cash")}</h2>
              <p className="rb-numeral text-lg">{data.cashHeld.map((o) => money(o.amountMinor, o.currency)).join(" + ") || "0"}</p>
            </div>
          </div>
          <section className={box}>
            <h2 className="rb-title mb-3">{t("carriers.payables")}</h2>
            {!data.payables.length ? <p className="text-ink-muted">{t("carriers.noPayables")}</p> : null}
            <ul className="divide-y divide-line">
              {data.payables.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span>
                    <span className="rb-mono-s">{p.shipmentReference}</span>
                    {p.deliveredAt ? <span className="text-ink-muted"> · {format.shortDate(p.deliveredAt)}</span> : null}
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="rb-numeral">{money(p.amountMinor, p.currency)}</span>
                    <Badge variant={PAY_TONE[p.status]}>{t(`payable.${p.status}`)}</Badge>
                  </span>
                </li>
              ))}
            </ul>
          </section>
          <section className={box}>
            <h2 className="rb-title mb-3">{t("carriers.settlements")}</h2>
            {!data.settlements.length ? <p className="text-ink-muted">{t("carriers.noSettlements")}</p> : null}
            <ul className="divide-y divide-line">
              {data.settlements.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span className="rb-mono-s">{s.reference}</span>
                  <span className="flex items-center gap-3">
                    <span className="rb-numeral">{money(s.amountMinor, s.currency)}</span>
                    {s.paymentRef ? <span className="text-ink-muted">{s.paymentRef}</span> : null}
                    <Badge variant={PAY_TONE[s.status]}>{t(`settlement.${s.status}`)}</Badge>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      ) : null}
    </div>
  );
}

/** Customs' real charge beside the checkout estimate, which never changes. */
export function CustomsAssessmentPanel({ orderId, canRecord }: { orderId: string; canRecord: boolean }) {
  const t = useTranslations("finance");
  const format = useFormat();
  const money = useMoney();
  const { data, error, reload, setError } = useLoad<{ currency: string; estimatedMinor: number; assessedMinor: number | null; varianceMinor: number | null; assessments: { id: string; amountMinor: number; reference: string; assessedAt: string }[] }>(`/store-orders/${orderId}/customs-assessments`);
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  if (!data) return error ? <State error={error} /> : null;
  if (!data.estimatedMinor && !data.assessments.length && !canRecord) return null;
  const amountMinor = toMinor(amount, data.currency);

  async function save() {
    setBusy(true);
    try {
      await call("POST", `/store-orders/${orderId}/customs-assessments`, { amountMinor, reference: reference.trim(), assessedAt: new Date().toISOString() });
      setAmount("");
      setReference("");
      await reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={box}>
      <h2 className="rb-title mb-3">{t("customs.title")}</h2>
      <dl className="grid gap-1">
        <div className="flex justify-between gap-3">
          <dt className="text-ink-muted">{t("customs.estimated")}</dt>
          <dd className="rb-numeral">{money(data.estimatedMinor, data.currency)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-ink-muted">{t("customs.assessed")}</dt>
          <dd className="rb-numeral">{data.assessedMinor == null ? t("customs.notYet") : money(data.assessedMinor, data.currency)}</dd>
        </div>
        {data.varianceMinor != null ? (
          <div className="flex justify-between gap-3">
            <dt className="text-ink-muted">{t("customs.variance")}</dt>
            <dd className="rb-numeral">{money(data.varianceMinor, data.currency)}</dd>
          </div>
        ) : null}
      </dl>
      {data.assessments.map((a) => (
        <p key={a.id} className="mt-2 text-ink-muted">
          {a.reference} · {format.shortDate(a.assessedAt)} · {money(a.amountMinor, data.currency)}
        </p>
      ))}
      {canRecord ? (
        <div className="mt-3 grid max-w-sm gap-2">
          <Field label={t("customs.amount", { currency: data.currency })}>
            <input className={input} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
          <Field label={t("customs.reference")}>
            <input className={input} maxLength={120} value={reference} onChange={(e) => setReference(e.target.value)} />
          </Field>
          <Button variant="secondary" loading={busy} disabled={amountMinor == null || reference.trim().length < 2} onClick={() => void save()}>
            {t("customs.record")}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
