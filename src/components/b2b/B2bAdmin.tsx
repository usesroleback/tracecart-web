"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { Field, input } from "@/components/ui/form/Form";
import { call } from "@/components/checkout/http";
import { QueueChip, useListFilters } from "@/components/console/ListTools";
import { countryName } from "@/lib/country";
import { toMajor, toMinor } from "@/lib/currency";
import { useFormat } from "@/lib/format";
import { useSession } from "@/context/SessionContext";

type Status = "PENDING" | "ACTIVE" | "CLOSED" | "SUSPENDED";

interface Row {
  id: string;
  status: Status;
  name: string;
  countryCode: string | null;
  city: string;
  orderLimitMinor: number;
  currency: string;
  ownerUserId: string;
}

interface Detail extends Row {
  addressLine: string;
  phone: string | null;
  taxId: string | null;
  decisionNote: string | null;
}

const TONE: Record<Status, "info" | "positive" | "critical" | "attn"> = { PENDING: "info", ACTIVE: "positive", CLOSED: "critical", SUSPENDED: "attn" };
const LIST_FILTERS = ["queue"] as const;
const box = "rounded-[var(--radius-m)] border border-line bg-surface-raised p-5 text-sm";

export function B2bList() {
  const t = useTranslations("b2b.admin");
  const locale = useLocale();
  const { applied, query, apply } = useListFilters(LIST_FILTERS);
  const [rows, setRows] = useState<Row[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (after: string | null, filters: string) => {
    const p = new URLSearchParams(filters);
    p.set("limit", "50");
    if (after) p.set("cursor", after);
    try {
      const res = await call<{ items: Row[]; nextCursor: string | null }>("GET", `/b2b?${p}`);
      setRows((prev) => (after ? [...prev, ...res.items] : res.items));
      setCursor(res.nextCursor);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    load(null, query);
  }, [load, query]);

  return (
    <div>
      <h1 className="rb-headline mb-1 text-[28px]">{t("title")}</h1>
      <p className="mb-6 text-sm text-ink-muted">{t("lead")}</p>
      {applied.queue ? <QueueChip label={t("queues.toReview")} onClear={() => apply({ queue: "" })} /> : null}
      {error ? <p className="mb-4 text-sm text-critical">{error}</p> : null}
      <div className="overflow-x-auto rounded-[var(--radius-m)] border border-line bg-surface-raised">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line text-ink-muted">
            <tr>
              <th className="px-4 py-3 font-medium">{t("columns.company")}</th>
              <th className="px-4 py-3 font-medium">{t("columns.status")}</th>
              <th className="px-4 py-3 font-medium">{t("columns.place")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-surface-sunken">
                <td className="px-4 py-3">
                  <Link href={`/b2b/${r.id}`} className="font-medium text-ink hover:underline">
                    {r.name}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={TONE[r.status]}>{t(`statuses.${r.status}`)}</Badge>
                </td>
                <td className="px-4 py-3">
                  {r.city}
                  {r.countryCode ? `, ${countryName(r.countryCode, locale)}` : ""}
                </td>
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

export function B2bDetail({ id }: { id: string }) {
  const t = useTranslations("b2b.admin");
  const locale = useLocale();
  const format = useFormat();
  const me = useSession();
  const [s, setS] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [limit, setLimit] = useState("");

  useEffect(() => {
    call<{ application: Detail }>("GET", `/b2b/${id}`).then(
      (d) => {
        setS(d.application);
        setLimit(String(toMajor(d.application.orderLimitMinor, d.application.currency)));
      },
      (e) => setError((e as Error).message)
    );
  }, [id]);

  async function decide(decision: "APPROVE" | "REJECT") {
    setBusy(true);
    setError(null);
    try {
      const orderLimitMinor = toMinor(limit, s!.currency);
      const res = await call<{ application: Detail }>("POST", `/b2b/${id}/decision`, {
        decision,
        note: note.trim() || undefined,
        ...(decision === "APPROVE" && orderLimitMinor != null ? { orderLimitMinor } : {}),
      });
      setS(res.application);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!s) return error ? <p className="text-sm text-critical">{error}</p> : <p className="text-sm text-ink-muted">{t("loading")}</p>;
  const own = s.ownerUserId === me.id;

  return (
    <div className="flex flex-col gap-4">
      <Link href="/b2b" className="text-sm text-ink-muted hover:text-ink">
        {t("title")}
      </Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="rb-headline text-[28px]">{s.name}</h1>
        <Badge variant={TONE[s.status]}>{t(`statuses.${s.status}`)}</Badge>
      </div>
      {error ? <p className="text-sm text-critical">{error}</p> : null}
      <section className={box}>
        <p>
          {s.phone}
          {s.taxId ? ` · ${s.taxId}` : ""}
        </p>
        <p>{[s.addressLine, s.city, s.countryCode ? countryName(s.countryCode, locale) : null].filter(Boolean).join(", ")}</p>
        {s.status === "ACTIVE" ? <p className="mt-2">{format.number(toMajor(s.orderLimitMinor, s.currency))} {s.currency}</p> : null}
        {s.decisionNote ? <p className="mt-2 whitespace-pre-line">{s.decisionNote}</p> : null}
      </section>
      {s.status === "PENDING" ? (
        <section className={`${box} grid gap-3`}>
          {own ? <p className="text-critical">{t("ownApplication")}</p> : null}
          <Field label={t("limit")}>
            <input className={input} inputMode="decimal" value={limit} onChange={(e) => setLimit(e.target.value)} />
          </Field>
          <Field label={t("note")} hint={t("theyRead")}>
            <textarea className={`${input} h-auto min-h-[4rem] py-2`} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          <Button variant="primary" loading={busy} disabled={own} onClick={() => decide("APPROVE")}>
            {t("approve")}
          </Button>
          <Button variant="secondary" loading={busy} disabled={own} onClick={() => decide("REJECT")}>
            {t("reject")}
          </Button>
        </section>
      ) : null}
    </div>
  );
}
