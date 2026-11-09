"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useFormat } from "@/lib/format";
import { toMajor } from "@/lib/currency";
import { Badge } from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { call } from "@/components/checkout/http";

// A customer's payments and refunds, newest first, with their documents.

type Status = "PENDING" | "AUTHORIZED" | "CAPTURED" | "PARTIALLY_REFUNDED" | "REFUNDED" | "FAILED" | "CANCELLED" | "EXPIRED" | "PENDING_APPROVAL" | "APPROVED" | "PAID";
const TONE: Record<Status, "default" | "attn" | "positive" | "critical" | "info"> = {
  PENDING: "attn",
  AUTHORIZED: "info",
  CAPTURED: "positive",
  PARTIALLY_REFUNDED: "info",
  REFUNDED: "info",
  FAILED: "critical",
  CANCELLED: "default",
  EXPIRED: "default",
  PENDING_APPROVAL: "attn",
  APPROVED: "info",
  PAID: "positive",
};

interface Entry {
  kind: "PAYMENT" | "REFUND";
  id: string;
  createdAt: string;
  settledAt: string | null;
  orderReference: string;
  method: string;
  status: Status;
  amountMinor: number;
  currency: string;
  invoiceNumber: string | null;
  returnReference: string | null;
  creditNoteNumber: string | null;
}

const box = "rounded-[var(--radius-m)] border border-line bg-surface-raised p-5 text-sm";

export function MyPayments() {
  const t = useTranslations("account.payments");
  const methods = useTranslations("checkout.order.methods");
  const format = useFormat();
  const [items, setItems] = useState<Entry[] | null>(null);
  const [next, setNext] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (before?: string) => {
    setBusy(true);
    try {
      const res = await call<{ items: Entry[]; next: string | null }>("GET", `/me/payments${before ? `?before=${encodeURIComponent(before)}` : ""}`);
      setItems((prev) => (before ? [...(prev ?? []), ...res.items] : res.items));
      setNext(res.next);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <div>
        <h1 className="rb-headline text-[28px]">{t("title")}</h1>
        <p className="mt-1 text-sm text-ink-muted">{t("lead")}</p>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-critical">
          {error}
        </p>
      ) : null}
      {items && !items.length ? <p className="text-sm text-ink-muted">{t("empty")}</p> : null}
      {items?.length ? (
        <ul className={`${box} divide-y divide-line p-0`}>
          {items.map((e) => (
            <li key={e.id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
              <div className="min-w-0">
                <p className="font-medium">
                  {e.kind === "PAYMENT" ? t("payment") : t("refund")} · {methods(e.method as "FAKE")}
                </p>
                <p className="text-ink-muted">
                  {format.date(e.createdAt)}
                  {e.settledAt ? ` · ${e.kind === "PAYMENT" ? t("statuses.CAPTURED") : t("statuses.PAID")} ${t("settled", { date: format.date(e.settledAt) })}` : ""}
                </p>
                <p className="mt-1 flex flex-wrap gap-x-3">
                  <Link href={`/account/orders/${e.orderReference}`} className="underline">
                    {t("order", { reference: e.orderReference })}
                  </Link>
                  {e.returnReference ? (
                    <Link href="/account/returns" className="underline">
                      {t("return", { reference: e.returnReference })}
                    </Link>
                  ) : null}
                  {e.invoiceNumber ? (
                    <a href={`/api/tracecart/me/orders/${e.orderReference}/invoice`} className="underline">
                      {t("invoice", { number: e.invoiceNumber })}
                    </a>
                  ) : null}
                  {e.creditNoteNumber ? (
                    <a href={`/api/tracecart/me/refunds/${e.id}/credit-note.pdf`} className="underline">
                      {t("creditNote", { number: e.creditNoteNumber })}
                    </a>
                  ) : null}
                </p>
              </div>
              <div className="text-right">
                <p className={`font-semibold tabular-nums ${e.kind === "REFUND" ? "text-positive" : ""}`}>
                  {e.kind === "REFUND" ? "+ " : ""}
                  {format.money(toMajor(e.amountMinor, e.currency), e.currency)}
                </p>
                <Badge variant={TONE[e.status]}>{t(`statuses.${e.status}`)}</Badge>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
      {next ? (
        <div>
          <Button variant="secondary" loading={busy} onClick={() => load(next)}>
            {t("more")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
