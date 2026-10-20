"use client";

import { Fragment, ReactNode } from "react";
import { CorridorTracker } from "./CorridorTracker";
import { OrderStatusTag } from "@/components/ui/status/Status";
import { Badge } from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { DsArrowRightIcon } from "@/icons";
import { Order } from "@/lib/types";

function formatAmount(order: Order): string | null {
  if (order.customerQuoteTotal == null) return null;
  return `${order.customerQuoteTotal.toLocaleString("fr-FR")} ${order.currency ?? order.hub.currency}`;
}

function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
}

function sourceLabel(order: Order): string {
  if (order.intakeType === "CUSTOMER_OWNED") return "Transport seul";
  return order.provider?.name ?? "Boutique inconnue";
}

function OrderDetail({ order, children }: { order: Order; children?: ReactNode }) {
  return (
    <div className="grid gap-4">
      <CorridorTracker status={order.status} hubCity={order.hub.city} destinationCity={order.destinationCity} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-muted">
          {order.customerName} · {order.customerPhone}
        </p>
        <Button href={`/orders/${order.id}`} size="s" variant="secondary" endIcon={<DsArrowRightIcon width={16} height={16} />}>
          Ouvrir la fiche
        </Button>
      </div>
      {children}
    </div>
  );
}

const TH = "sticky top-0 whitespace-nowrap border-b border-line bg-surface-sunken px-3 py-2 text-left text-[12px] font-[650] uppercase tracking-[0.04em] text-ink-muted";
const TD = "border-b border-line px-3 py-2 align-middle";

/**
 * TraceCartOps dense table (project/components/TraceCartOps/preview.html):
 * reference in mono, two-line cells instead of more columns, status as shape
 * + word, 8px row padding. A row opens in place to show the order's tools
 * (renderDetail). Below sm it becomes a card list (07-components, Responsive:
 * "Ops table becomes a card list"); in between it scrolls with the reference
 * column pinned.
 */
export function OrdersTable({
  orders,
  openId,
  onToggle,
  renderDetail,
  caption,
}: {
  orders: Order[];
  openId: string | null;
  onToggle: (id: string) => void;
  renderDetail: (order: Order) => ReactNode;
  caption: string;
}) {
  return (
    <>
      {/* sm and up: the table */}
      <div className="hidden w-full overflow-x-auto rounded-[var(--radius-m)] border border-line bg-surface-raised sm:block">
        <table className="w-full min-w-[760px] border-separate border-spacing-0 text-sm leading-5">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr>
              <th scope="col" className={`${TH} left-0 z-10 lg:static`}>Commande</th>
              <th scope="col" className={TH}>Produit / client</th>
              <th scope="col" className={TH}>Trajet</th>
              <th scope="col" className={TH}>Statut</th>
              <th scope="col" className={`${TH} text-right`}>Montant</th>
              <th scope="col" className={TH}>Mis à jour</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order, i) => {
              const open = order.id === openId;
              const last = i === orders.length - 1;
              const td = `${TD} ${last && !open ? "border-b-0" : ""}`;
              const amount = formatAmount(order);
              return (
                <Fragment key={order.id}>
                  <tr
                    id={`order-${order.id}`}
                    onClick={() => onToggle(order.id)}
                    className={`cursor-pointer transition-colors duration-[var(--duration-quick)] ease-[var(--ease-out)] ${
                      open ? "bg-accent-soft" : "bg-surface-raised hover:bg-surface-sunken"
                    }`}
                  >
                    <td className={`${td} sticky left-0 bg-inherit lg:static`}>
                      <button
                        type="button"
                        aria-expanded={open}
                        aria-controls={`order-detail-${order.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggle(order.id);
                        }}
                        className="rb-mono whitespace-nowrap rounded-[var(--radius-xs)] text-left text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                      >
                        {order.reference}
                      </button>
                      <span className="block text-[13px] text-ink-muted">{sourceLabel(order)}</span>
                    </td>
                    <td className={td}>
                      <b className="font-semibold">
                        {order.productName}
                        {order.quantity > 1 ? ` × ${order.quantity}` : ""}
                      </b>
                      <span className="block text-[13px] text-ink-muted">{order.customerName}</span>
                    </td>
                    <td className={`${td} whitespace-nowrap`}>
                      {order.hub.city} → {order.destinationCity}
                      <span className="block text-[13px] text-ink-muted">{order.destinationCountry}</span>
                    </td>
                    <td className={td}>
                      <OrderStatusTag status={order.status} />
                      {order.status === "QUOTE_SENT" && order.quoteAcceptedAt && (
                        <span className="mt-1 block">
                          <Badge variant="positive">Accepté par le client</Badge>
                        </span>
                      )}
                    </td>
                    <td className={`${td} whitespace-nowrap text-right font-semibold tabular-nums`}>
                      {amount ?? <span className="font-normal text-ink-muted">—</span>}
                    </td>
                    <td className={`${td} whitespace-nowrap tabular-nums text-ink-muted`}>{formatDay(order.updatedAt)}</td>
                  </tr>
                  {open && (
                    <tr id={`order-detail-${order.id}`}>
                      <td colSpan={6} className={`${TD} ${last ? "border-b-0" : ""} bg-surface-raised px-4 py-5`}>
                        <OrderDetail order={order}>{renderDetail(order)}</OrderDetail>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Below sm: a card list — ID, route, status, amount */}
      <ul className="grid gap-2 sm:hidden" aria-label={caption}>
        {orders.map((order) => {
          const open = order.id === openId;
          const amount = formatAmount(order);
          return (
            <li
              key={order.id}
              id={`order-card-${order.id}`}
              className={`rounded-[var(--radius-m)] border bg-surface-raised ${
                open ? "border-ink shadow-[inset_0_0_0_1px_var(--color-ink)]" : "border-line"
              }`}
            >
              <button
                type="button"
                aria-expanded={open}
                aria-controls={`order-card-detail-${order.id}`}
                onClick={() => onToggle(order.id)}
                className="grid min-h-11 w-full gap-1 rounded-[var(--radius-m)] p-4 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="rb-mono text-ink">{order.reference}</span>
                  <OrderStatusTag status={order.status} />
                </span>
                <span className="font-semibold text-ink">
                  {order.productName}
                  {order.quantity > 1 ? ` × ${order.quantity}` : ""}
                </span>
                <span className="flex justify-between gap-3 text-sm text-ink-muted">
                  <span>
                    {order.hub.city} → {order.destinationCity}
                  </span>
                  {amount && <span className="font-semibold tabular-nums text-ink">{amount}</span>}
                </span>
              </button>
              {open && (
                <div id={`order-card-detail-${order.id}`} className="border-t border-line p-4">
                  <OrderDetail order={order}>{renderDetail(order)}</OrderDetail>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
