"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { Field, input } from "@/components/ui/form/Form";
import { QueueChip, useListFilters } from "@/components/console/ListTools";
import { call } from "@/components/checkout/http";
import { useFormat } from "@/lib/format";
import { toMajor } from "@/lib/currency";

const STATUSES = ["DUE", "PENDING_APPROVAL", "SENDING", "PAID", "FAILED", "CANCELLED"] as const;
type Status = (typeof STATUSES)[number];
const TONE: Record<Status, "default" | "info" | "positive" | "attn" | "critical"> = {
  DUE: "attn",
  PENDING_APPROVAL: "info",
  SENDING: "info",
  PAID: "positive",
  FAILED: "critical",
  CANCELLED: "default",
};
const LIST_FILTERS = ["q", "status", "queue"] as const;
const box = "rounded-[var(--radius-m)] border border-line bg-surface-raised p-5 text-sm";

interface Line {
  id: string;
  orderReference: string;
  sku: string;
  itemMinor: number;
  commissionBps: number;
  commissionMinor: number;
  dueMinor: number;
}

interface Row {
  id: string;
  reference: string;
  seller: { id: string; name: string };
  amountMinor: number;
  currency: string;
  status: Status;
  provider: string;
  providerRef: string | null;
  dueAt: string;
  paidAt: string | null;
  failedReason: string | null;
  lines?: Line[];
}

export function FinancePayouts() {
  return <PayoutsList staff />;
}

export function SellerPayouts() {
  return <PayoutsList staff={false} />;
}

function PayoutsList({ staff }: { staff: boolean }) {
  const t = useTranslations("payouts");
  const format = useFormat();
  const { applied, query, apply } = useListFilters(LIST_FILTERS);
  const [q, setQ] = useState(applied.q);
  const [rows, setRows] = useState<Row[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const base = staff ? "/payouts" : "/seller/payouts";

  const load = useCallback(
    async (after: string | null, filters: string) => {
      const p = new URLSearchParams(filters);
      p.set("limit", "50");
      if (after) p.set("cursor", after);
      try {
        const res = await call<{ items: Row[]; nextCursor: string | null }>("GET", `${base}?${p}`);
        setRows((prev) => (after ? [...prev, ...res.items] : res.items));
        setCursor(res.nextCursor);
        setError(null);
      } catch (e) {
        setError((e as Error).message);
      }
    },
    [base]
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQ(applied.q);
    load(null, query);
  }, [load, query, applied.q]);

  return (
    <div>
      <h1 className="rb-headline mb-1 text-[28px]">{staff ? t("title") : t("mine")}</h1>
      <p className="mb-6 text-sm text-ink-muted">{staff ? t("lead") : t("mineLead")}</p>
      {staff && applied.queue ? <QueueChip label={t(`queues.${applied.queue}` as "queues.toSend")} onClear={() => apply({ ...applied, queue: "" })} /> : null}
      {staff ? (
        <div className="mb-4">
          <Assemble onDone={() => load(null, query)} />
        </div>
      ) : null}
      <form
        className="mb-4 flex flex-wrap gap-2"
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          apply({ ...applied, q });
        }}
      >
        <input className={`${input} max-w-sm`} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search")} aria-label={t("search")} />
        <Button type="submit" size="s">
          {t("find")}
        </Button>
      </form>
      {error ? <p className="mb-3 text-sm text-critical">{error}</p> : null}
      {!rows.length ? <p className="text-sm text-ink-muted">{t("empty")}</p> : null}
      <ul className="grid gap-3">
        {rows.map((row) => (
          <li key={row.id}>
            <Link href={staff ? `/payouts/${row.id}` : `/seller/payouts/${row.id}`} className="block">
              <div className={box}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium font-mono">{row.reference}</p>
                  <Badge tone={TONE[row.status]}>{t(`statuses.${row.status}`)}</Badge>
                </div>
                <p className="mt-1 text-ink-muted">{staff ? row.seller.name : t("amountDue")}</p>
                <p className="rb-numeral mt-2 text-[22px]">{format.money(toMajor(row.amountMinor, row.currency), row.currency)}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
      {cursor ? (
        <Button className="mt-4" size="s" type="button" onClick={() => load(cursor, query)}>
          {t("more")}
        </Button>
      ) : null}
    </div>
  );
}

function Assemble({ onDone }: { onDone: () => void }) {
  const t = useTranslations("payouts");
  const [busy, setBusy] = useState(false);
  return (
    <Button
      size="s"
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await call("POST", "/payouts/assemble");
          onDone();
        } finally {
          setBusy(false);
        }
      }}
    >
      {t("assemble")}
    </Button>
  );
}

export function PayoutDetail({ id, staff }: { id: string; staff: boolean }) {
  const t = useTranslations("payouts");
  const format = useFormat();
  const [row, setRow] = useState<Row | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ref, setRef] = useState("");
  const [busy, setBusy] = useState(false);
  const path = staff ? `/payouts/${id}` : `/seller/payouts/${id}`;

  const load = useCallback(async () => {
    try {
      setRow(await call<Row>("GET", path));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [path]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) return <p className="text-sm text-critical">{error}</p>;
  if (!row) return <p className="text-sm text-ink-muted">{t("loading")}</p>;

  const money = (n: number) => format.money(toMajor(n, row.currency), row.currency);
  const act = async (method: "send" | "mark-paid" | "cancel" | "process", body?: unknown) => {
    setBusy(true);
    try {
      if (method === "process") await call("POST", "/payouts/process");
      else await call("POST", `/payouts/${id}/${method}`, body);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <p className="rb-overline">{row.reference}</p>
      <h1 className="rb-headline mb-2 text-[28px]">{staff ? row.seller.name : t("mine")}</h1>
      <Badge tone={TONE[row.status]}>{t(`statuses.${row.status}`)}</Badge>
      <p className="rb-numeral mt-4 text-[32px]">{money(row.amountMinor)}</p>
      <p className="mt-1 text-sm text-ink-muted">{t("via", { provider: row.provider })}{row.providerRef ? ` · ${row.providerRef}` : ""}</p>
      {row.failedReason ? <p className="mt-2 text-sm text-critical">{row.failedReason}</p> : null}
      <ul className="mt-6 grid gap-2">
        {(row.lines ?? []).map((l) => (
          <li key={l.id} className={box}>
            <p className="font-medium">{l.orderReference}</p>
            <p className="text-ink-muted">{l.sku}</p>
            <p className="mt-1">{money(l.dueMinor)}</p>
          </li>
        ))}
      </ul>
      {staff && (row.status === "DUE" || row.status === "FAILED") ? (
        <div className="mt-6 flex flex-wrap gap-3">
          <Button type="button" disabled={busy} onClick={() => act("send")}>
            {t("send")}
          </Button>
          <form
            className="flex flex-wrap items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              act("mark-paid", { providerRef: ref });
            }}
          >
            <Field label={t("transferRef")}>
              <input className={input} value={ref} onChange={(e) => setRef(e.target.value)} required />
            </Field>
            <Button type="submit" disabled={busy} size="s">
              {t("markPaid")}
            </Button>
          </form>
          <Button type="button" disabled={busy} variant="ghost" onClick={() => act("cancel")}>
            {t("cancel")}
          </Button>
        </div>
      ) : null}
      {staff && row.status === "SENDING" ? (
        <Button className="mt-6" type="button" disabled={busy} onClick={() => act("process")}>
          {t("process")}
        </Button>
      ) : null}
      <p className="mt-8 text-sm">
        <Link href={staff ? "/payouts" : "/seller/payouts"} className="underline">
          {t("back")}
        </Link>
      </p>
    </div>
  );
}
