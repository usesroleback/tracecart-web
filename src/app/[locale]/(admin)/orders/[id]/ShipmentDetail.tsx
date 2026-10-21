"use client";

import { ReactNode, useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { api } from "@/lib/apiClient";
import { useSession } from "@/context/SessionContext";
import { OrderAdminPanel } from "@/components/tracecart/OrderAdminPanel";
import { OrderPartnerPanel } from "@/components/tracecart/OrderPartnerPanel";
import { LocationTimeline } from "@/components/tracecart/LocationTimeline";
import { ShipmentFile } from "@/components/tracecart/ShipmentFile";
import { QuoteBreakdown } from "@/components/tracecart/QuoteBreakdown";
import { ShipmentTracking } from "@/components/tracecart/ShipmentTracking";
import { OrderExceptions } from "@/components/tracecart/OrderExceptions";
import { RouteTimeline, orderRouteSteps } from "@/components/tracecart/RouteTimeline";
import { Alert } from "@/components/ui/alert/Alert";
import { Badge } from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { Card } from "@/components/ui/card/Card";
import { OrderStatusTag } from "@/components/ui/status/Status";
import { DsChevronRightIcon, DsExternalIcon } from "@/icons";
import { Order, OrderHistoryEntry } from "@/lib/types";
import { Format, useFormat } from "@/lib/format";

function money(f: Format, value: string | number | null | undefined, currency: string): string | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? f.money(n, currency) : null;
}

/** dt/dd pairs as in TraceCartShipment's cargo and customs cards. */
function Facts({ items }: { items: [string, ReactNode, { mono?: boolean }?][] }) {
  return (
    <dl className="mt-4 grid gap-3">
      {items
        .filter(([, v]) => v != null && v !== "")
        .map(([k, v, opts]) => (
          <div key={k}>
            <dt className="text-xs font-semibold uppercase tracking-[0.04em] text-ink-muted">{k}</dt>
            <dd className={`mt-0.5 font-[560] text-ink ${opts?.mono ? "rb-mono" : ""}`}>{v}</dd>
          </div>
        ))}
    </dl>
  );
}

/**
 * Shipment detail (project/components/TraceCartShipment/preview.html): the
 * route as the headline, the timeline, an alert for anything that needs
 * someone, then cargo / customer / hub & partner facts, money, history and
 * photos. The order's tools sit in the right column (stacked below on
 * small screens), so this page is where an order gets worked.
 */
export function ShipmentDetail({ initialOrder, initialHistory }: { initialOrder: Order; initialHistory: OrderHistoryEntry[] }) {
  const user = useSession();
  const t = useTranslations("orders");
  const td = (key: string, values?: Record<string, string | number>) => t(`detail.${key}`, values);
  const tl = useTranslations("labels");
  const f = useFormat();
  const dayTime = f.dayTime;
  const isAdmin = user.role === "SUPER_ADMIN";
  const [order, setOrder] = useState(initialOrder);
  const [history, setHistory] = useState(initialHistory);
  const [copied, setCopied] = useState(false);

  const refresh = useCallback(async () => {
    const [o, h] = await Promise.all([
      api.get<Order>(`/orders/${order.id}`),
      api.get<OrderHistoryEntry[]>(`/orders/${order.id}/history`),
    ]);
    setOrder(o);
    setHistory(h);
  }, [order.id]);

  async function copyCustomerLink() {
    if (!order.quoteToken) return;
    try {
      // The customer's quote and tracking page, in their language.
      await navigator.clipboard.writeText(`${window.location.origin}/${order.customerLocale}/q/${order.quoteToken}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }

  const currency = order.currency ?? order.hub.currency;
  const stopped = order.status === "DECLINED" || order.status === "UNAVAILABLE";
  const stopEntry = stopped ? [...history].reverse().find((h) => h.toStatus === order.status) : undefined;
  const backHref = isAdmin ? "/orders" : "/deliveries";
  const backLabel = td(isAdmin ? "back.admin" : "back.carrier");
  const total = money(f, order.customerQuoteTotal, currency);
  const goodsPhotos = order.photos.filter((p) => p.kind !== "PROOF_OF_DELIVERY");
  const openExceptions = order.exceptions.filter((x) => x.status === "OPEN");

  return (
    <div>
      <nav aria-label={td("breadcrumb")} className="flex items-center gap-1.5 text-sm text-ink-muted">
        <Link href={backHref} className="rb-link text-ink-muted">
          {backLabel}
        </Link>
        <DsChevronRightIcon width={16} height={16} aria-hidden />
        <span aria-current="page" className="rb-mono text-ink">
          {order.reference}
        </span>
      </nav>

      <div className="mt-6 flex flex-wrap items-end justify-between gap-6">
        <div className="min-w-0">
          <div className="rb-mono text-ink-muted">
            {order.reference} · {order.customerName}
          </div>
          <h1 className="rb-display rb-display-l mt-2">
            {order.hub.city} → {order.destinationCity}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
            <OrderStatusTag status={order.status} />
            <span className="text-sm text-ink-muted">{td("updated", { when: dayTime(order.updatedAt) })}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {order.productUrl && (
            <Button variant="ghost" href={order.productUrl} endIcon={<DsExternalIcon width={18} height={18} />}>
              {td("productPage")}
            </Button>
          )}
          {isAdmin && order.quoteToken && (
            <Button variant="secondary" onClick={copyCustomerLink}>
              {copied ? td("copied") : td("copyLink")}
            </Button>
          )}
        </div>
      </div>

      <Card route padding={32} className="mt-6">
        <RouteTimeline animate steps={orderRouteSteps(order, history, t, f)} label={t("route.labelFor", { reference: order.reference })} />
      </Card>

      <div className="mt-4 grid gap-3" aria-live="polite">
        {stopped && (
          <Alert tone="critical" title={td(order.status === "DECLINED" ? "declined" : "unavailable")}>
            {stopEntry?.note ?? td("noNextStep")}
            {stopEntry && td("stoppedBy", { name: stopEntry.changedByUser.name, when: dayTime(stopEntry.createdAt) })}
          </Alert>
        )}
        {openExceptions.length > 0 && (
          <Alert tone="critical" title={t("exceptions.title")}>
            {openExceptions.map((x) => x.summary).join(" · ")}
          </Alert>
        )}
        {isAdmin && order.status === "QUOTE_SENT" && order.quoteAcceptedAt && (
          <Alert tone="positive" title={td("accepted.title")}>
            {td("accepted.body", { when: dayTime(order.quoteAcceptedAt) })}
          </Alert>
        )}
        {isAdmin && order.status === "QUOTE_SENT" && !order.quoteAcceptedAt && (
          <Alert tone="info" title={td("sent.title")}>
            {td("sent.body")}
          </Alert>
        )}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <div className="grid min-w-0 gap-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Card padding={24}>
              <h2 className="rb-title">{td("cargo")}</h2>
              <Facts
                items={[
                  [td("product"), order.productName],
                  [td("quantity"), f.number(order.quantity)],
                  [td("volume"), tl(`volumeTier.${order.volumeTier}`)],
                  [td("source"), order.intakeType === "CUSTOMER_OWNED" ? t("source.customerOwned") : order.provider?.name ?? t("source.unknownStore")],
                  [td("notes"), order.notes],
                ]}
              />
            </Card>
            <Card padding={24}>
              <h2 className="rb-title">{td("customer")}</h2>
              <Facts
                items={[
                  [td("name"), order.customerName],
                  [td("phone"), order.customerPhone, { mono: true }],
                  [td("email"), order.customerEmail],
                  [td("language"), order.customerLocale === "en" ? "English" : "Français"],
                  [td("destination"), `${order.destinationCity}, ${order.destinationCountry}`],
                ]}
              />
            </Card>
            <Card padding={24} className="md:col-span-2 xl:col-span-1">
              <h2 className="rb-title">{td("hubCarrier")}</h2>
              <Facts
                items={[
                  [td("hub"), `${order.hub.name} · ${order.hub.city}, ${order.hub.country}`],
                  [td("carrier"), order.assignedPartner?.name ?? tl("unassigned")],
                  [td("phone"), order.assignedPartner?.phone, { mono: true }],
                  [td("createdBy"), isAdmin ? order.createdByUser?.name : undefined],
                ]}
              />
            </Card>
          </div>

          <ShipmentFile order={order} isAdmin={isAdmin} onChanged={refresh} />

          <Card padding={24}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="rb-title">{td("payment")}</h2>
              {isAdmin &&
                (order.paymentStatus === "PAID" ? (
                  <Badge variant="positive">{td("paid")}{order.paidAt ? ` · ${dayTime(order.paidAt)}` : ""}</Badge>
                ) : (
                  <Badge variant="outline">{td("unpaid")}</Badge>
                ))}
            </div>
            <table className="mt-3 w-full border-separate border-spacing-0 text-sm leading-5">
              <caption className="sr-only">{td("amountsCaption", { reference: order.reference })}</caption>
              <tbody>
                {(isAdmin
                  ? [
                      [td("product"), money(f, order.productCost, currency)],
                      [td("logistics"), money(f, order.logisticsCost, order.logisticsQuote?.currency ?? currency)],
                      [td("fee"), money(f, order.platformFee, currency)],
                    ]
                  : [[td("yourLogisticsQuote"), money(f, order.logisticsCost, order.logisticsQuote?.currency ?? currency)]]
                ).map(([label, value]) => (
                  <tr key={label}>
                    <th scope="row" className="border-b border-line py-2 pr-3 text-left font-normal text-ink-muted">
                      {label}
                    </th>
                    <td className="border-b border-line py-2 text-right tabular-nums">{value ?? "—"}</td>
                  </tr>
                ))}
                {isAdmin && (
                  <tr>
                    <th scope="row" className="py-2.5 pr-3 text-left font-semibold">
                      {td("customerTotal")}
                    </th>
                    <td className="py-2.5 text-right text-base font-semibold tabular-nums">{total ?? td("notQuoted")}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </Card>

          {isAdmin && <QuoteBreakdown order={order} />}

          <OrderExceptions order={order} isAdmin={isAdmin} onChanged={refresh} />

          <ShipmentTracking order={order} onChanged={refresh} />

          <div className="grid gap-4 md:grid-cols-2">
            <Card padding={24}>
              <h2 className="rb-title">{td("history")}</h2>
              {history.length === 0 ? (
                <p className="mt-3 text-sm text-ink-muted">{td("noHistory")}</p>
              ) : (
                <ol className="mt-3 grid">
                  {[...history].reverse().map((h) => (
                    <li key={h.id} className="border-b border-line py-2.5 last:border-b-0">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                        <span className="font-semibold text-ink">{tl(`status.${h.toStatus}`)}</span>
                        <span className="rb-mono text-xs text-ink-muted">{dayTime(h.createdAt)}</span>
                      </div>
                      <p className="text-[13px] text-ink-muted">
                        {h.changedByUser.name}
                        {h.note ? ` — ${h.note}` : ""}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </Card>
            <Card padding={24}>
              <h2 className="rb-title">{td("positions")}</h2>
              <div className="mt-3">
                <LocationTimeline updates={order.locationUpdates} />
              </div>
            </Card>
          </div>
        </div>

        {/* Actions first on small screens (they are why the page is opened), beside the facts from lg. */}
        <div className="order-first grid gap-4 lg:sticky lg:top-24 lg:order-none">
          <Card padding={24}>
            <h2 className="rb-title">{td("nextStep")}</h2>
            <div className="mt-4">
              {isAdmin ? (
                <OrderAdminPanel order={order} onChanged={refresh} showLocations={false} />
              ) : (
                <OrderPartnerPanel order={order} onChanged={refresh} />
              )}
            </div>
          </Card>
          <Card variant="sunken" padding={24}>
            <h2 className="rb-title">{td("photos")}</h2>
            {goodsPhotos.length === 0 ? (
              <p className="mt-2 text-sm text-ink-muted">{td("noPhotos")}</p>
            ) : (
              <ul className="mt-3 grid grid-cols-3 gap-2">
                {goodsPhotos.map((p) => (
                  <li key={p.id}>
                    <a
                      href={`/api/tracecart${p.url}`}
                      target="_blank"
                      rel="noreferrer"
                      className="block overflow-hidden rounded-[var(--radius-s)] border border-line focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/api/tracecart${p.url}`}
                        alt={p.originalName ?? td("photoOf", { product: order.productName })}
                        className="aspect-square w-full object-cover"
                      />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
