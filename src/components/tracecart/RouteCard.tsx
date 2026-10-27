"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { api } from "@/lib/apiClient";
import Button from "@/components/ui/button/Button";
import { Badge } from "@/components/ui/badge/Badge";
import { Card } from "@/components/ui/card/Card";
import { Order, RouteOptions } from "@/lib/types";
import { useFormat } from "@/lib/format";

const ROUTABLE = new Set(["INTENT_SUBMITTED", "QUOTING", "QUOTED"]);

/**
 * The order's route (docs/design/pricing-routing-and-customs.md §5): which
 * carrier service it goes with, and before the quote is sent, every active
 * service as it would serve this order — fits or why not, when it would
 * arrive, on time or not. Choosing another carrier asks them to quote.
 */
export function RouteCard({ order, onChanged }: { order: Order; onChanged: () => void }) {
  const t = useTranslations("orders");
  const tl = useTranslations("labels");
  const f = useFormat();
  const routable = ROUTABLE.has(order.status);
  const [data, setData] = useState<RouteOptions | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!routable) return;
    let cancelled = false;
    api.get<RouteOptions>(`/orders/${order.id}/route-options`).then(
      (d) => !cancelled && setData(d),
      () => !cancelled && setData(null),
    );
    return () => {
      cancelled = true;
    };
  }, [order.id, order.updatedAt, routable]);

  async function choose(serviceId: string) {
    setBusy(serviceId);
    setError(null);
    try {
      await api.post(`/orders/${order.id}/route`, { carrierServiceId: serviceId });
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("actionFailed"));
    } finally {
      setBusy(null);
    }
  }

  const window = (from: string, to: string) =>
    from.slice(0, 10) === to.slice(0, 10) ? f.date(from) : t("tracking.etaRange", { from: f.date(from), to: f.date(to) });

  return (
    <Card padding={24}>
      <h2 className="rb-title">{t("route.card.title")}</h2>
      <p className="mt-1 text-sm text-ink">
        {order.carrierService ? t("route.card.current", { name: `${order.carrierService.name} · ${tl(`transportMode.${order.carrierService.mode}`)}` }) : t("route.card.none")}
      </p>
      {!routable && <p className="mt-1 text-[13px] text-ink-muted">{t("route.card.frozen")}</p>}
      {routable && data && data.options.length === 0 && <p className="mt-2 text-sm text-ink-muted">{t("route.card.noServices")}</p>}
      {routable && data && data.options.length > 0 && (
        <>
          <ul className="mt-3 grid" aria-label={t("route.card.caption")}>
            {data.options.map((o) => {
              const chosen = data.current === o.serviceId;
              const otherCarrier = o.service.partner.id !== order.assignedPartnerId;
              return (
                <li key={o.serviceId} className={`border-b border-line py-3 last:border-b-0 ${o.eligible ? "" : "text-ink-muted"}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold">
                        {o.service.name} <span className="font-normal text-ink-muted">· {tl(`transportMode.${o.service.mode}`)} · {o.service.partner.name}</span>
                      </p>
                      <p className="text-[13px]">{t("route.card.arrival", { window: window(o.etaFrom, o.etaTo) })}</p>
                      <p className="text-[13px] text-ink-muted">
                        {o.price.priced
                          ? t("route.card.priced", { amount: f.money(o.price.amount, o.price.currency) })
                          : o.price.reason === "noWeight"
                            ? t("route.card.noWeight")
                            : t("route.card.byHand")}
                      </p>
                      <p className="mt-1 flex flex-wrap gap-1">
                        {o.meetsDeadline === true && <Badge variant="positive">{t("route.card.onTime")}</Badge>}
                        {o.meetsDeadline === false && <Badge variant={data.requiredByIsHard ? "critical" : "attn"}>{t("route.card.late")}</Badge>}
                        {o.blockers.map((b) => (
                          <Badge key={b} variant="outline">
                            {tl(`routeBlocker.${b}`)}
                          </Badge>
                        ))}
                        {o.unchecked.map((u) => (
                          <Badge key={u} variant="attn">
                            {tl(`routeUnchecked.${u}`)}
                          </Badge>
                        ))}
                      </p>
                    </div>
                    {chosen ? (
                      <Badge variant="inverse">{t("route.card.chosen")}</Badge>
                    ) : (
                      o.eligible &&
                      !(data.requiredByIsHard && o.meetsDeadline === false) && (
                        <Button variant="secondary" size="s" loading={busy === o.serviceId} onClick={() => choose(o.serviceId)}>
                          {t("route.card.choose")}
                        </Button>
                      )
                    )}
                  </div>
                  {!chosen && o.eligible && otherCarrier && order.logisticsQuote && <p className="mt-1 text-xs text-ink-muted">{t("route.card.newQuote")}</p>}
                </li>
              );
            })}
          </ul>
          {error && <p className="mt-2 text-xs text-critical">{error}</p>}
        </>
      )}
    </Card>
  );
}
