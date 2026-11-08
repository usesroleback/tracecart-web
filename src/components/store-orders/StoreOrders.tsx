"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useFormat } from "@/lib/format";
import { toMajor } from "@/lib/currency";
import { Badge } from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { input } from "@/components/ui/form/Form";
import { call } from "@/components/checkout/http";
import type { OrderView } from "@/components/checkout/types";
import { OrderRefunds } from "@/components/returns/Returns";
import { ExportButton, QueueChip, SavedViews, useListFilters } from "@/components/console/ListTools";
import { useSession } from "@/context/SessionContext";

const LIST_FILTERS = ["q", "status", "queue"] as const;

const STATUSES = ["PENDING_APPROVAL", "PENDING_PAYMENT", "PLACED", "PROCESSING", "PARTIALLY_SHIPPED", "SHIPPED", "PARTIALLY_DELIVERED", "DELIVERED", "CANCELLED", "ON_HOLD"] as const;
const TONE: Record<string, "positive" | "attn" | "default" | "critical" | "info"> = {
  PENDING_APPROVAL: "attn",
  PENDING_PAYMENT: "attn",
  PLACED: "positive",
  PROCESSING: "info",
  PARTIALLY_SHIPPED: "info",
  SHIPPED: "info",
  PARTIALLY_DELIVERED: "info",
  DELIVERED: "positive",
  CANCELLED: "critical",
  ON_HOLD: "attn",
  CAPTURED: "positive",
  PENDING: "attn",
  FAILED: "critical",
  EXPIRED: "critical",
};

interface Row {
  id: string;
  reference: string;
  status: string;
  createdAt: string;
  customer: { name: string; email: string };
  totalMinor: number;
  currency: string;
  paymentMethod: string;
  paymentStatus: string | null;
  deliveryMethod: string;
  lineCount: number;
  promiseTo: string;
}

/** Store orders in the console: newest first, by status or reference/customer. */
export function StoreOrdersList() {
  const t = useTranslations("storeOrders");
  const ts = useTranslations("checkout.order.status");
  const format = useFormat();
  const user = useSession();
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
      const res = await call<{ items: Row[]; nextCursor: string | null }>("GET", `/store-orders?${p}`);
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
        <SavedViews list="storeOrders" query={query} onApply={apply} />
        {user.permissions?.includes("orders.store.export") ? <ExportButton path="/store-orders/export.csv" query={query} /> : null}
      </div>
      {applied.queue ? <QueueChip label={t("queues.paymentsToConfirm")} onClear={() => apply({ ...applied, queue: "" })} /> : null}
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
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {ts(s)}
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
              <th className="px-4 py-3 font-medium">{t("columns.order")}</th>
              <th className="px-4 py-3 font-medium">{t("columns.customer")}</th>
              <th className="px-4 py-3 font-medium">{t("columns.status")}</th>
              <th className="px-4 py-3 font-medium">{t("columns.payment")}</th>
              <th className="px-4 py-3 text-right font-medium">{t("columns.total")}</th>
              <th className="px-4 py-3 font-medium">{t("columns.promise")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-surface-sunken">
                <td className="px-4 py-3">
                  <Link href={`/store-orders/${r.id}`} className="rb-mono font-medium text-ink hover:underline">
                    {r.reference}
                  </Link>
                  <p className="text-xs text-ink-muted">{format.dayTime(r.createdAt)}</p>
                </td>
                <td className="px-4 py-3">
                  {r.customer.name}
                  <p className="text-xs text-ink-muted">{r.customer.email}</p>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={TONE[r.status] ?? "default"}>{ts(r.status as "PLACED")}</Badge>
                </td>
                <td className="px-4 py-3">
                  {t(`methods.${r.paymentMethod}` as "methods.FAKE")}
                  {r.paymentStatus ? <p className="text-xs text-ink-muted">{t(`paymentStatus.${r.paymentStatus}` as "paymentStatus.PENDING")}</p> : null}
                </td>
                <td className="rb-numeral px-4 py-3 text-right">
                  {format.number(toMajor(r.totalMinor, r.currency))} {r.currency}
                </td>
                <td className="px-4 py-3 text-ink-muted">{format.shortDate(r.promiseTo)}</td>
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

type StaffOrder = OrderView & {
  customer: { name: string; email: string; phone: string | null };
  events: { id: string; event: string; from: string | null; to: string; note: string | null; createdAt: string }[];
  reservations: { id: string; quantity: number; state: string; expiresAt: string | null }[];
};

interface OrderShipment {
  id: string;
  reference: string;
  status: string;
  warehouse: { city: string };
  carrier: { name: string } | null;
  lines: { orderLineId: string }[];
}

/** One store order in the console: lines, payments, holds, history; cancel and confirm a transfer. */
export function StoreOrderDetail({ id, canCancel, canConfirm, canRefund }: { id: string; canCancel: boolean; canConfirm: boolean; canRefund: boolean }) {
  const t = useTranslations("storeOrders");
  const tShip = useTranslations("shipments");
  const ts = useTranslations("checkout.order.status");
  const format = useFormat();
  const [order, setOrder] = useState<StaffOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [shipments, setShipments] = useState<OrderShipment[]>([]);

  useEffect(() => {
    call<StaffOrder>("GET", `/store-orders/${id}`)
      .then(setOrder)
      .catch((e) => setError((e as Error).message));
    call<{ shipments: OrderShipment[] }>("GET", `/store-orders/${id}/shipments`)
      .then((r) => setShipments(r.shipments))
      .catch(() => undefined);
  }, [id]);

  async function act(fn: () => Promise<StaffOrder>) {
    setBusy(true);
    setError(null);
    try {
      setOrder(await fn());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (error && !order) return <p className="text-critical">{error}</p>;
  if (!order) return <p className="text-ink-muted">…</p>;
  const money = (minor: number) => `${format.number(toMajor(minor, order.currency))} ${order.currency}`;
  const transfer = order.payments.find((p) => (p.method === "BANK_TRANSFER" || p.method === "NET_30") && p.status === "PENDING");
  const d = order.delivery;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/store-orders" className="text-sm text-ink-muted hover:text-ink">
          ← {t("title")}
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="rb-headline rb-mono text-[26px]">{order.reference}</h1>
          <Badge variant={TONE[order.status] ?? "default"}>{ts(order.status as "PLACED")}</Badge>
          {order.kind !== "PRODUCTS" ? <Badge variant="info">{t(`kind.${order.kind}`)}</Badge> : null}
        </div>
        <p className="mt-1 text-sm text-ink-muted">
          {order.customer.name} · {order.customer.email}
          {order.customer.phone ? ` · ${order.customer.phone}` : ""}
        </p>
      </div>
      {error ? <p className="text-sm text-critical">{error}</p> : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <section className="rounded-[var(--radius-m)] border border-line bg-surface-raised p-5">
          <h2 className="rb-title mb-3">{t("lines")}</h2>
          <table className="w-full text-left text-sm">
            <thead className="text-ink-muted">
              <tr>
                <th className="py-2 font-medium">{t("columns.item")}</th>
                <th className="py-2 text-right font-medium">{t("columns.item_total")}</th>
                <th className="py-2 text-right font-medium">{t("columns.shipping")}</th>
                <th className="py-2 text-right font-medium">{t("columns.duties")}</th>
                <th className="py-2 text-right font-medium">{t("columns.total")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {order.lines.map((l) => (
                <tr key={l.id}>
                  <td className="py-2">
                    {l.title} × {l.quantity}
                    <p className="rb-mono-s text-ink-muted">
                      {l.sku} · {l.fulfillmentType ? t(`fulfillment.${l.fulfillmentType}` as "fulfillment.TRACECART_STOCK") : t("kind.FREIGHT")} · {l.status}
                    </p>
                  </td>
                  <td className="rb-numeral py-2 text-right">{money(l.breakdown.itemMinor)}</td>
                  <td className="rb-numeral py-2 text-right">{money(l.breakdown.shippingMinor)}</td>
                  <td className="rb-numeral py-2 text-right">{money(l.breakdown.dutiesMinor + l.breakdown.taxesMinor + l.breakdown.feesMinor)}</td>
                  <td className="rb-numeral py-2 text-right font-medium">{money(l.breakdown.totalMinor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-right font-semibold">
            {t("columns.total")}: <span className="rb-numeral">{money(order.totals.totalMinor)}</span>
          </p>

          {shipments.length ? (
            <>
              <h2 className="rb-title mb-2 mt-6">{t("shipments")}</h2>
              <ul className="divide-y divide-line text-sm">
                {shipments.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <Link href={`/shipments/${s.id}`} className="rb-mono font-medium underline">
                      {s.reference}
                    </Link>
                    <span className="text-ink-muted">
                      {s.warehouse.city}
                      {s.carrier ? ` · ${s.carrier.name}` : ""}
                    </span>
                    <span>{tShip(`statuses.${s.status}` as "statuses.PLANNED")}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          <h2 className="rb-title mb-2 mt-6">{t("history")}</h2>
          <ol className="space-y-1 text-sm">
            {order.events.map((e) => (
              <li key={e.id}>
                <span className="text-ink-muted">{format.dayTime(e.createdAt)}</span> · {e.event}
                {e.note ? ` · ${e.note}` : ""}
              </li>
            ))}
          </ol>
        </section>

        <aside className="flex flex-col gap-4">
          <div className="rounded-[var(--radius-m)] border border-line bg-surface-raised p-5 text-sm">
            <h2 className="rb-label mb-2">{order.deliveryMethod === "PICKUP" ? t("pickup") : t("address")}</h2>
            {d.pickupPoint ? (
              <p>
                {d.pickupPoint.name}, {d.pickupPoint.city}
                <br />
                {d.recipientName} · {d.phone}
              </p>
            ) : (
              <p>
                {d.recipientName ?? d.contactName} · {d.phone}
                <br />
                {[d.street, d.addressLine, d.district, d.city, d.countryCode].filter(Boolean).join(", ")}
                <br />
                <span className="text-ink-muted">{d.landmark}</span>
              </p>
            )}
            <p className="mt-2 text-ink-muted">{t("promise", { from: format.shortDate(order.promise.from), to: format.shortDate(order.promise.to) })}</p>
          </div>
          <div className="rounded-[var(--radius-m)] border border-line bg-surface-raised p-5 text-sm">
            <h2 className="rb-label mb-2">{t("payments")}</h2>
            <ul className="space-y-1">
              {order.payments.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center gap-2">
                  {t(`methods.${p.method}` as "methods.FAKE")}
                  <Badge variant={TONE[p.status] ?? "default"}>{t(`paymentStatus.${p.status}` as "paymentStatus.PENDING")}</Badge>
                  <span className="rb-numeral">{money(p.amountMinor)}</span>
                </li>
              ))}
            </ul>
            {transfer && canConfirm ? (
              <Button variant="primary" className="mt-3" loading={busy} onClick={() => act(() => call<StaffOrder>("POST", `/payments/${transfer.id}/confirm`))}>
                {t("confirmTransfer")}
              </Button>
            ) : null}
            {order.invoice ? (
              <a href={`/api/tracecart/store-orders/${order.id}/invoice`} className="mt-3 block font-medium text-ink underline">
                {t("invoice", { number: order.invoice.number })}
              </a>
            ) : null}
          </div>
          <OrderRefunds key={order.status} orderId={order.id} currency={order.currency} canRefund={canRefund} />
          {canCancel && !["CANCELLED", "SHIPPED", "DELIVERED", "COMPLETED", "PARTIALLY_SHIPPED", "PARTIALLY_DELIVERED"].includes(order.status) ? (
            <form
              className="rounded-[var(--radius-m)] border border-line bg-surface-raised p-5 text-sm"
              onSubmit={(e) => {
                e.preventDefault();
                act(() => call<StaffOrder>("POST", `/store-orders/${order.id}/cancel`, { reason }));
              }}
            >
              <label className="rb-label mb-2 block" htmlFor="cancel-reason">
                {t("cancel")}
              </label>
              <input id="cancel-reason" className={input} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t("cancelReason")} required minLength={3} maxLength={300} />
              <Button type="submit" variant="danger" className="mt-3" loading={busy}>
                {t("cancelCta")}
              </Button>
            </form>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
