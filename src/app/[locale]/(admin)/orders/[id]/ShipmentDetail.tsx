"use client";

import { ReactNode, useCallback, useState } from "react";
import { Link } from "@/i18n/navigation";
import { api } from "@/lib/apiClient";
import { useSession } from "@/context/SessionContext";
import { OrderAdminPanel } from "@/components/tracecart/OrderAdminPanel";
import { OrderPartnerPanel } from "@/components/tracecart/OrderPartnerPanel";
import { LocationTimeline } from "@/components/tracecart/LocationTimeline";
import { RouteTimeline, orderRouteSteps } from "@/components/tracecart/RouteTimeline";
import { Alert } from "@/components/ui/alert/Alert";
import { Badge } from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { Card } from "@/components/ui/card/Card";
import { OrderStatusTag } from "@/components/ui/status/Status";
import { DsChevronRightIcon, DsExternalIcon } from "@/icons";
import { Order, OrderHistoryEntry, STATUS_LABELS, VOLUME_TIER_LABELS } from "@/lib/types";

function dayTime(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function money(value: string | number | null | undefined, currency: string): string | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? `${n.toLocaleString("fr-FR")} ${currency}` : null;
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
      await navigator.clipboard.writeText(`${window.location.origin}/q/${order.quoteToken}`);
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
  const backLabel = isAdmin ? "Commandes" : "Livraisons";
  const total = money(order.customerQuoteTotal, currency);

  return (
    <div>
      <nav aria-label="Fil d'Ariane" className="flex items-center gap-1.5 text-sm text-ink-muted">
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
            <span className="text-sm text-ink-muted">Mis à jour {dayTime(order.updatedAt)}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {order.productUrl && (
            <Button variant="ghost" href={order.productUrl} endIcon={<DsExternalIcon width={18} height={18} />}>
              Fiche produit
            </Button>
          )}
          {isAdmin && order.quoteToken && (
            <Button variant="secondary" onClick={copyCustomerLink}>
              {copied ? "Lien copié" : "Copier le lien client"}
            </Button>
          )}
        </div>
      </div>

      <Card route padding={32} className="mt-6">
        <RouteTimeline animate steps={orderRouteSteps(order, history)} label={`Trajet de ${order.reference}`} />
      </Card>

      <div className="mt-4 grid gap-3" aria-live="polite">
        {stopped && (
          <Alert tone="critical" title={`Commande ${order.status === "DECLINED" ? "refusée" : "indisponible"}.`}>
            {stopEntry?.note ?? "Aucune autre étape n'est prévue pour cette commande."}
            {stopEntry && ` — ${stopEntry.changedByUser.name}, ${dayTime(stopEntry.createdAt)}.`}
          </Alert>
        )}
        {isAdmin && order.status === "QUOTE_SENT" && order.quoteAcceptedAt && (
          <Alert tone="positive" title="Le client a accepté le devis.">
            Le {dayTime(order.quoteAcceptedAt)}. Enregistrez le paiement dès qu&apos;il est reçu.
          </Alert>
        )}
        {isAdmin && order.status === "QUOTE_SENT" && !order.quoteAcceptedAt && (
          <Alert tone="info" title="Devis envoyé au client.">
            En attente de sa réponse. Vous pouvez lui renvoyer le lien.
          </Alert>
        )}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <div className="grid min-w-0 gap-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Card padding={24}>
              <h2 className="rb-title">Marchandise</h2>
              <Facts
                items={[
                  ["Produit", order.productName],
                  ["Quantité", order.quantity.toLocaleString("fr-FR")],
                  ["Volume", VOLUME_TIER_LABELS[order.volumeTier]],
                  ["Source", order.intakeType === "CUSTOMER_OWNED" ? "Transport seul" : order.provider?.name ?? "Boutique inconnue"],
                  ["Notes", order.notes],
                ]}
              />
            </Card>
            <Card padding={24}>
              <h2 className="rb-title">Client</h2>
              <Facts
                items={[
                  ["Nom", order.customerName],
                  ["Téléphone", order.customerPhone, { mono: true }],
                  ["E-mail", order.customerEmail],
                  ["Destination", `${order.destinationCity}, ${order.destinationCountry}`],
                ]}
              />
            </Card>
            <Card padding={24} className="md:col-span-2 xl:col-span-1">
              <h2 className="rb-title">Hub et partenaire</h2>
              <Facts
                items={[
                  ["Hub", `${order.hub.name} · ${order.hub.city}, ${order.hub.country}`],
                  ["Partenaire", order.assignedPartner?.name ?? "Non assigné"],
                  ["Téléphone", order.assignedPartner?.phone, { mono: true }],
                  ["Créée par", isAdmin ? order.createdByUser?.name : undefined],
                ]}
              />
            </Card>
          </div>

          <Card padding={24}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="rb-title">Paiement</h2>
              {isAdmin &&
                (order.paymentStatus === "PAID" ? (
                  <Badge variant="positive">Payé{order.paidAt ? ` · ${dayTime(order.paidAt)}` : ""}</Badge>
                ) : (
                  <Badge variant="outline">Non payé</Badge>
                ))}
            </div>
            <table className="mt-3 w-full border-separate border-spacing-0 text-sm leading-5">
              <caption className="sr-only">Montants de la commande {order.reference}</caption>
              <tbody>
                {(isAdmin
                  ? [
                      ["Produit", money(order.productCost, currency)],
                      ["Logistique", money(order.logisticsCost, order.logisticsQuote?.currency ?? currency)],
                      ["Frais TraceCart", money(order.platformFee, currency)],
                    ]
                  : [["Votre devis logistique", money(order.logisticsCost, order.logisticsQuote?.currency ?? currency)]]
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
                      Total client
                    </th>
                    <td className="py-2.5 text-right text-base font-semibold tabular-nums">{total ?? "Pas encore coté"}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card padding={24}>
              <h2 className="rb-title">Historique</h2>
              {history.length === 0 ? (
                <p className="mt-3 text-sm text-ink-muted">Aucun changement de statut enregistré.</p>
              ) : (
                <ol className="mt-3 grid">
                  {[...history].reverse().map((h) => (
                    <li key={h.id} className="border-b border-line py-2.5 last:border-b-0">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                        <span className="font-semibold text-ink">{STATUS_LABELS[h.toStatus]}</span>
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
              <h2 className="rb-title">Positions</h2>
              <div className="mt-3">
                <LocationTimeline updates={order.locationUpdates} />
              </div>
            </Card>
          </div>
        </div>

        {/* Actions first on small screens (they are why the page is opened), beside the facts from lg. */}
        <div className="order-first grid gap-4 lg:sticky lg:top-24 lg:order-none">
          <Card padding={24}>
            <h2 className="rb-title">Prochaine étape</h2>
            <div className="mt-4">
              {isAdmin ? (
                <OrderAdminPanel order={order} onChanged={refresh} showLocations={false} />
              ) : (
                <OrderPartnerPanel order={order} onChanged={refresh} />
              )}
            </div>
          </Card>
          <Card variant="sunken" padding={24}>
            <h2 className="rb-title">Photos</h2>
            {order.photos.length === 0 ? (
              <p className="mt-2 text-sm text-ink-muted">Pas encore de photos de la marchandise.</p>
            ) : (
              <ul className="mt-3 grid grid-cols-3 gap-2">
                {order.photos.map((p) => (
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
                        alt={p.originalName ?? `Photo de ${order.productName}`}
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
