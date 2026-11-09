"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useFormat } from "@/lib/format";
import { toMajor } from "@/lib/currency";
import Button from "@/components/ui/button/Button";
import { Link } from "@/i18n/navigation";
import { call } from "@/components/checkout/http";

interface Load {
  id: string;
  reference: string;
  status: "FORMING" | "READY";
  route: string;
  closesAt: string;
  shipments: { id: string; reference: string; status: string }[];
  aloneCostMinor: number | null;
  combinedCostMinor: number | null;
  costCurrency: string | null;
}

/** Standard shipments leaving together (ADR-090): what's forming, when it leaves, what grouping saved. */
export function Loads() {
  const t = useTranslations("shipments.loads");
  const f = useFormat();
  const [items, setItems] = useState<Load[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    call<{ items: Load[] }>("GET", "/shipment-loads")
      .then((r) => setItems(r.items))
      .catch((e: Error) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  async function send(id: string) {
    setBusy(id);
    setError(null);
    try {
      await call("POST", `/shipment-loads/${id}/close`);
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const money = (minor: number, currency: string) => `${f.number(toMajor(minor, currency))} ${currency}`;

  return (
    <div>
      <h1 className="rb-headline text-[28px]">{t("title")}</h1>
      <p className="mb-5 mt-1 max-w-2xl text-sm text-ink-muted">{t("lead")}</p>
      {error ? (
        <p role="alert" className="mb-4 text-sm text-critical">
          {error}
        </p>
      ) : null}
      {items && !items.length ? <p className="text-sm text-ink-muted">{t("empty")}</p> : null}
      <ul className="grid gap-3">
        {items?.map((l) => {
          const saved = l.aloneCostMinor != null && l.combinedCostMinor != null && l.costCurrency ? l.aloneCostMinor - l.combinedCostMinor : 0;
          return (
            <li key={l.id} className="rounded-[var(--radius-m)] border border-line bg-surface-raised p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="rb-mono-s text-ink-muted">{l.reference}</p>
                  <p className="font-semibold text-ink">{l.route}</p>
                  <p className="text-sm text-ink-muted">{l.status === "FORMING" ? t("leaves", { date: new Date(l.closesAt).toLocaleString() }) : t("ready")}</p>
                </div>
                <div className="flex items-center gap-4">
                  {saved > 0 ? <p className="text-sm font-medium text-ink">{t("saved", { amount: money(saved, l.costCurrency!) })}</p> : null}
                  {l.status === "FORMING" ? (
                    <Button size="s" loading={busy === l.id} onClick={() => send(l.id)}>
                      {t("sendNow")}
                    </Button>
                  ) : null}
                </div>
              </div>
              <ul className="mt-3 flex flex-wrap gap-2 text-sm">
                {l.shipments.map((s) => (
                  <li key={s.id}>
                    <Link href={`/shipments/${s.id}`} className="rb-mono-s rounded-[var(--radius-xs)] border border-line px-2 py-1 hover:border-ink">
                      {s.reference}
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
