"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useFormat } from "@/lib/format";
import { toMajor } from "@/lib/currency";
import { countryName } from "@/lib/country";
import { Badge } from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { Field, input } from "@/components/ui/form/Form";
import { call } from "@/components/checkout/http";
import { FreightEstimateView } from "@/components/services/FreightEstimate";
import type { CargoEstimate, FreightPlace, Indicative } from "@/components/services/types";
import { CarrierRequest, FreightCarriers } from "./FreightCarriers";

// Freight requests in the console (ADR-036): logistics staff check the AI's
// estimate against the photos and send the firm quote.

const STATUSES = ["SUBMITTED", "QUOTED", "ACCEPTED", "CANCELLED", "CLOSED"] as const;
const TONE: Record<string, "positive" | "attn" | "default" | "critical" | "info"> = { SUBMITTED: "attn", QUOTED: "info", ACCEPTED: "positive", CANCELLED: "critical", CLOSED: "default", SENT: "info", EXPIRED: "default", WITHDRAWN: "default", DECLINED: "critical" };

interface Row {
  reference: string;
  status: string;
  createdAt: string;
  customer: { name: string; email: string };
  from: FreightPlace;
  to: FreightPlace;
  description: string;
  mediaCount: number;
  estimateStatus: string;
  indicative: { lowMinor: number; highMinor: number; currency: string } | null;
}

export function FreightList() {
  const t = useTranslations("freightAdmin");
  const format = useFormat();
  const [status, setStatus] = useState<string>("SUBMITTED");
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    call<{ requests: Row[] }>("GET", `/freight-requests${status ? `?status=${status}` : ""}`).then(
      (r) => setRows(r.requests),
      (e) => setError((e as Error).message)
    );
  }, [status]);

  const money = (minor: number, currency: string) => `${format.number(toMajor(minor, currency))} ${currency}`;
  return (
    <div>
      <h1 className="rb-headline text-[28px]">{t("title")}</h1>
      <p className="mt-1 text-sm text-ink-muted">{t("lead")}</p>
      <nav className="mt-4 flex flex-wrap gap-2 text-sm">
        {["", ...STATUSES].map((s) => (
          <button key={s || "all"} type="button" onClick={() => setStatus(s)} className={`rounded-full border px-3 py-1 ${status === s ? "border-ink bg-ink text-ink-inverse" : "border-line-strong"}`}>
            {s ? t(`status.${s}`) : t("all")}
          </button>
        ))}
      </nav>
      {error ? <p className="mt-3 text-sm text-critical">{error}</p> : null}
      <div tabIndex={0} className="mt-4 overflow-x-auto rounded-[var(--radius-m)] border border-line bg-surface-raised">
        <table className="w-full text-left text-sm">
          <thead className="text-ink-muted">
            <tr>
              <th className="px-4 py-3 font-medium">{t("columns.reference")}</th>
              <th className="px-4 py-3 font-medium">{t("columns.route")}</th>
              <th className="px-4 py-3 font-medium">{t("columns.customer")}</th>
              <th className="px-4 py-3 font-medium">{t("columns.status")}</th>
              <th className="px-4 py-3 text-right font-medium">{t("columns.estimate")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={r.reference}>
                <td className="px-4 py-3">
                  <Link href={`/freight-requests/${r.reference}`} className="rb-mono font-medium text-ink underline">
                    {r.reference}
                  </Link>
                  <p className="text-xs text-ink-muted">{format.dayTime(r.createdAt)}</p>
                </td>
                <td className="px-4 py-3">
                  {r.from.city} → {r.to.city}
                  <p className="line-clamp-1 text-xs text-ink-muted">{r.description}</p>
                </td>
                <td className="px-4 py-3">
                  {r.customer.name}
                  <p className="text-xs text-ink-muted">{r.customer.email}</p>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={TONE[r.status] ?? "default"}>{t(`status.${r.status}` as "status.SUBMITTED")}</Badge>
                </td>
                <td className="rb-numeral px-4 py-3 text-right">{r.indicative ? `${money(r.indicative.lowMinor, r.indicative.currency)} – ${money(r.indicative.highMinor, r.indicative.currency)}` : t("noEstimate")}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && !error ? <p className="px-4 py-8 text-center text-ink-muted">{t("empty")}</p> : null}
      </div>
    </div>
  );
}

interface StaffQuote {
  id: string;
  reference: string;
  status: string;
  currency: string;
  totals: { itemMinor: number; shippingMinor: number; dutiesMinor: number; taxesMinor: number; feesMinor: number; totalMinor: number };
  cargo: { packageCount: number; weightKg: number; volumeM3: number | null } | null;
  promise: { from: string; to: string };
  validUntil: string;
  note: string | null;
  createdAt: string;
  order: { reference: string; status: string } | null;
}

interface Detail {
  reference: string;
  status: string;
  createdAt: string;
  customer: { name: string; email: string; phone: string | null };
  origin: FreightPlace;
  destination: FreightPlace;
  readyOn: string | null;
  description: string;
  declaredValueMinor: number | null;
  currency: string;
  media: { id: string; fromVideo: boolean; url: string }[];
  estimateStatus: "NONE" | "DONE" | "FAILED";
  estimateModel: string | null;
  estimateError: string | null;
  estimate: CargoEstimate | null;
  indicative: (Indicative & { serviceId: string | null }) | null;
  quotes: StaffQuote[];
  carrierRequests: CarrierRequest[];
}

export function FreightDetail({ reference, canQuote }: { reference: string; canQuote: boolean }) {
  const t = useTranslations("freightAdmin");
  const locale = useLocale();
  const format = useFormat();
  const [r, setR] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  // The carrier price the next quote rests on (ADR-081).
  const [chosen, setChosen] = useState<CarrierRequest | null>(null);
  const load = useCallback(() => call<Detail>("GET", `/freight-requests/${reference}`).then(setR, (e) => setError((e as Error).message)), [reference]);
  useEffect(() => {
    load();
  }, [load]);

  if (error && !r) return <p className="text-critical">{error}</p>;
  if (!r) return <p className="text-ink-muted">…</p>;
  const money = (minor: number) => `${format.number(toMajor(minor, r.currency))} ${r.currency}`;
  const place = (p: FreightPlace) => [p.addressLine, p.landmark, `${p.city}, ${countryName(p.countryCode, locale)}`].filter(Boolean).join(" · ");
  const open = r.status === "SUBMITTED" || r.status === "QUOTED";

  async function close() {
    if (!window.confirm(t("confirmClose"))) return;
    try {
      setR(await call<Detail>("POST", `/freight-requests/${reference}/close`));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/freight-requests" className="text-sm text-ink-muted hover:text-ink">
          ← {t("title")}
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="rb-headline rb-mono text-[26px]">{r.reference}</h1>
          <Badge variant={TONE[r.status] ?? "default"}>{t(`status.${r.status}` as "status.SUBMITTED")}</Badge>
        </div>
        <p className="mt-1 text-sm text-ink-muted">
          {r.customer.name} · {r.customer.email}
          {r.customer.phone ? ` · ${r.customer.phone}` : ""}
        </p>
      </div>
      {error ? <p className="text-sm text-critical">{error}</p> : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="flex flex-col gap-6">
          <section className="rounded-[var(--radius-m)] border border-line bg-surface-raised p-5 text-sm">
            <dl className="grid gap-2 sm:grid-cols-[140px_1fr]">
              <dt className="text-ink-muted">{t("collect")}</dt>
              <dd>
                {place(r.origin)}
                <br />
                {r.origin.contactName} · {r.origin.phone}
              </dd>
              <dt className="text-ink-muted">{t("deliver")}</dt>
              <dd>
                {place(r.destination)}
                <br />
                {r.destination.contactName} · {r.destination.phone}
              </dd>
              <dt className="text-ink-muted">{t("goods")}</dt>
              <dd className="whitespace-pre-line">{r.description}</dd>
              {r.readyOn ? (
                <>
                  <dt className="text-ink-muted">{t("readyOn")}</dt>
                  <dd>{format.date(r.readyOn)}</dd>
                </>
              ) : null}
              {r.declaredValueMinor != null ? (
                <>
                  <dt className="text-ink-muted">{t("declaredValue")}</dt>
                  <dd className="rb-numeral">{money(r.declaredValueMinor)}</dd>
                </>
              ) : null}
            </dl>
            {r.media.length ? (
              <ul className="mt-4 flex flex-wrap gap-2">
                {r.media.map((m) => (
                  <li key={m.id}>
                    <a href={`/api/tracecart${m.url}`} target="_blank" rel="noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/api/tracecart${m.url}`} alt={t(m.fromVideo ? "frame" : "photo")} className="size-28 rounded-[var(--radius-s)] border border-line object-cover" />
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-ink-muted">{t("noMedia")}</p>
            )}
          </section>
          <section>
            <h2 className="rb-title mb-3">{t("estimateTitle")}</h2>
            <FreightEstimateView status={r.estimateStatus} estimate={r.estimate} indicative={r.indicative} />
            {r.estimateModel ? <p className="mt-2 text-xs text-ink-muted">{t("readBy", { model: r.estimateModel })}</p> : null}
            {r.estimateError ? <p className="mt-2 text-xs text-critical">{r.estimateError}</p> : null}
          </section>
          <FreightCarriers reference={r.reference} requests={r.carrierRequests} canAsk={canQuote} open={open} chosenId={chosen?.id ?? null} onChoose={setChosen} onChanged={load} />
        </div>
        <aside className="flex flex-col gap-4">
          {r.quotes.length ? (
            <div className="rounded-[var(--radius-m)] border border-line bg-surface-raised p-5 text-sm">
              <h2 className="rb-label mb-2">{t("quotesTitle")}</h2>
              <ul className="grid gap-2">
                {r.quotes.map((q) => (
                  <li key={q.id} className="flex flex-wrap items-center gap-2">
                    <span className="rb-mono">{q.reference}</span>
                    <Badge variant={TONE[q.status] ?? "default"}>{t(`quoteStatus.${q.status}` as "quoteStatus.SENT")}</Badge>
                    <span className="rb-numeral">{money(q.totals.totalMinor)}</span>
                    {q.order ? (
                      <span className="w-full text-xs text-ink-muted">{t("order", { reference: q.order.reference })}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {canQuote && open ? <QuoteForm detail={r} carrierQuote={chosen} onClearCarrier={() => setChosen(null)} onSent={load} /> : null}
          {canQuote && open ? (
            <button type="button" onClick={close} className="self-start text-sm text-ink-muted underline">
              {t("close")}
            </button>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function QuoteForm({ detail, carrierQuote, onClearCarrier, onSent }: { detail: Detail; carrierQuote: CarrierRequest | null; onClearCarrier: () => void; onSent: () => void }) {
  const t = useTranslations("freightAdmin.quote");
  const format = useFormat();
  const ind = detail.indicative?.available ? detail.indicative : null;
  const est = detail.estimate;
  // Starting figures: the high end of the AI's range, which the agent checks.
  const [f, setF] = useState({
    packageCount: String(est?.packageCount ?? 1),
    weightKg: String(est?.weightKg.high ?? ""),
    shipping: String(ind?.high?.shippingMinor ?? ""),
    duties: String(ind?.high?.dutiesMinor ?? 0),
    taxes: String(ind?.high?.taxesMinor ?? 0),
    fees: String(ind?.high?.feesMinor ?? 0),
    // The estimate's window, else typed by the agent.
    promiseFrom: ind?.promise?.from ?? "",
    promiseTo: ind?.promise?.to ?? "",
    note: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }));
  const total = ["shipping", "duties", "taxes", "fees"].reduce((n, k) => n + (Number(f[k as keyof typeof f]) || 0), 0);

  async function send(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await call("POST", `/freight-requests/${detail.reference}/quotes`, {
        packageCount: Number(f.packageCount),
        weightKg: Number(f.weightKg),
        shippingMinor: Math.round(Number(f.shipping) || 0),
        dutiesMinor: Math.round(Number(f.duties) || 0),
        taxesMinor: Math.round(Number(f.taxes) || 0),
        feesMinor: Math.round(Number(f.fees) || 0),
        promiseFrom: f.promiseFrom,
        promiseTo: f.promiseTo,
        ...(f.note.trim() ? { note: f.note.trim() } : {}),
        ...(carrierQuote ? { carrierQuoteRequestId: carrierQuote.id } : {}),
      });
      onClearCarrier();
      onSent();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={send} className="grid gap-3 rounded-[var(--radius-m)] border border-line bg-surface-raised p-5 text-sm">
      <h2 className="rb-label">{t("title")}</h2>
      <p className="text-xs text-ink-muted">{t("hint")}</p>
      {carrierQuote && carrierQuote.amountMinor != null && carrierQuote.currency ? (
        <div className="rounded-[var(--radius-s)] border border-line bg-surface-sunken p-3">
          <p>{t("restsOn", { carrier: carrierQuote.carrier.name, price: `${format.number(toMajor(carrierQuote.amountMinor, carrierQuote.currency))} ${carrierQuote.currency}` })}</p>
          <p className="text-xs text-ink-muted">{t("restsOnHint")}</p>
          <button type="button" className="mt-1 text-xs underline" onClick={onClearCarrier}>
            {t("restsOnClear")}
          </button>
        </div>
      ) : (
        <p className="text-xs text-ink-muted">{t("noCarrier")}</p>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("packages")} required>
          <input className={input} type="number" min={1} required value={f.packageCount} onChange={set("packageCount")} />
        </Field>
        <Field label={t("weight")} required>
          <input className={input} type="number" min={0.1} step="any" required value={f.weightKg} onChange={set("weightKg")} />
        </Field>
        <Field label={t("shipping", { currency: detail.currency })} required>
          <input className={input} type="number" min={0} required value={f.shipping} onChange={set("shipping")} />
        </Field>
        <Field label={t("duties", { currency: detail.currency })}>
          <input className={input} type="number" min={0} value={f.duties} onChange={set("duties")} />
        </Field>
        <Field label={t("taxes", { currency: detail.currency })}>
          <input className={input} type="number" min={0} value={f.taxes} onChange={set("taxes")} />
        </Field>
        <Field label={t("fees", { currency: detail.currency })}>
          <input className={input} type="number" min={0} value={f.fees} onChange={set("fees")} />
        </Field>
        <Field label={t("from")} required>
          <input className={input} type="date" required value={f.promiseFrom} onChange={set("promiseFrom")} />
        </Field>
        <Field label={t("to")} required>
          <input className={input} type="date" required value={f.promiseTo} onChange={set("promiseTo")} />
        </Field>
      </div>
      <Field label={t("note")}>
        <textarea className={`${input} h-auto py-2`} rows={3} maxLength={1000} value={f.note} onChange={set("note")} />
      </Field>
      <p className="font-medium">{t("total", { total: `${total.toLocaleString()} ${detail.currency}` })}</p>
      {error ? <p className="text-critical">{error}</p> : null}
      <Button type="submit" variant="primary" loading={busy}>
        {t("send")}
      </Button>
    </form>
  );
}
