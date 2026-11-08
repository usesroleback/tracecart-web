"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { api } from "@/lib/apiClient";
import Button from "@/components/ui/button/Button";
import { Badge } from "@/components/ui/badge/Badge";
import { Field, input } from "@/components/ui/form/Form";
import { toMajor, toMinor } from "@/lib/currency";
import type { components } from "@/lib/api/schema";

type Status = "SCHEDULED" | "LIVE" | "ENDED" | "CANCELLED";
const TONE: Record<Status, "info" | "positive" | "default"> = { SCHEDULED: "info", LIVE: "positive", ENDED: "default", CANCELLED: "default" };
const CURRENCY = "XOF";

interface Deal {
  id: string;
  status: Status;
  priceMinor: number;
  currency: string;
  startsAt: string;
  endsAt: string;
  regularPriceMinor: number | null;
  offer: { sku: string; productTitle: Record<string, string> };
}

const empty = { sku: "", price: "", startsAt: "", endsAt: "" };

/** Deals (ADR-070): a lower price on one of Tracecart's own offers, for a set time. */
export function DealsAdmin() {
  const t = useTranslations("promotions.deals");
  const format = useFormatter();
  const locale = useLocale();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [f, setF] = useState(empty);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setDeals((await api.get<{ deals: Deal[] }>("/deals")).deals);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const money = (minor: number, currency: string) => `${format.number(toMajor(minor, currency))} ${currency}`;
  const when = (iso: string) => format.dateTime(new Date(iso), { dateStyle: "medium", timeStyle: "short" });

  async function add(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const priceMinor = toMinor(f.price, CURRENCY);
    if (!priceMinor) return setError(t("badPrice"));
    setBusy(true);
    try {
      const body: components["schemas"]["DealCreate"] = {
        sku: f.sku.trim(),
        priceMinor,
        endsAt: new Date(f.endsAt).toISOString(),
        ...(f.startsAt ? { startsAt: new Date(f.startsAt).toISOString() } : {}),
      };
      await api.post("/deals", body);
      setF(empty);
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function cancel(id: string) {
    setError(null);
    try {
      await api.post(`/deals/${id}/cancel`);
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="rb-headline text-[28px]">{t("title")}</h1>
        <p className="mt-1 text-sm text-ink-muted">{t("lead")}</p>
      </div>
      <form onSubmit={add} className="grid gap-3 rounded-[var(--radius-m)] border border-line bg-surface-raised p-4 sm:grid-cols-5">
        <Field label={t("sku")}>
          <input className={input} value={f.sku} onChange={(e) => setF((x) => ({ ...x, sku: e.target.value }))} required maxLength={64} />
        </Field>
        <Field label={t("price", { currency: CURRENCY })}>
          <input className={input} inputMode="decimal" value={f.price} onChange={(e) => setF((x) => ({ ...x, price: e.target.value }))} required />
        </Field>
        <Field label={t("startsAt")} hint={t("startsAtHint")}>
          <input className={input} type="datetime-local" value={f.startsAt} onChange={(e) => setF((x) => ({ ...x, startsAt: e.target.value }))} />
        </Field>
        <Field label={t("endsAt")}>
          <input className={input} type="datetime-local" value={f.endsAt} onChange={(e) => setF((x) => ({ ...x, endsAt: e.target.value }))} required />
        </Field>
        <div className="flex items-end">
          <Button type="submit" variant="primary" disabled={busy}>
            {t("add")}
          </Button>
        </div>
      </form>
      {error ? (
        <p role="alert" className="text-sm text-critical">
          {error}
        </p>
      ) : null}
      {!deals.length ? <p className="text-sm text-ink-muted">{t("empty")}</p> : null}
      <ul className="divide-y divide-line rounded-[var(--radius-m)] border border-line bg-surface-raised">
        {deals.map((d) => (
          <li key={d.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
            <span className="rb-mono-s font-medium">{d.offer.sku}</span>
            <span className="text-ink">{d.offer.productTitle[locale] ?? d.offer.productTitle.en ?? d.offer.productTitle.fr}</span>
            <span className="rb-numeral font-medium">{money(d.priceMinor, d.currency)}</span>
            {d.regularPriceMinor ? <s className="text-ink-muted">{money(d.regularPriceMinor, d.currency)}</s> : null}
            <span className="text-ink-muted">{t("window", { from: when(d.startsAt), to: when(d.endsAt) })}</span>
            <Badge variant={TONE[d.status]}>{t(`statuses.${d.status}`)}</Badge>
            {d.status === "SCHEDULED" || d.status === "LIVE" ? (
              <Button type="button" variant="secondary" size="s" onClick={() => cancel(d.id)}>
                {d.status === "LIVE" ? t("endNow") : t("cancel")}
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
