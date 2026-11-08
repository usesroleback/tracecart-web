"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { Field, input } from "@/components/ui/form/Form";
import { call } from "@/components/checkout/http";
import { useFormat } from "@/lib/format";
import { toMajor, toMinor } from "@/lib/currency";
import { countryName } from "@/lib/country";

// A carrier's quote requests (ADR-081): Tracecart asks for its price to move a
// freight cargo. It sees the cargo and the two cities, never the customer or
// what Tracecart charges; it answers with what it charges Tracecart.

export type QuoteStatus = "OPEN" | "QUOTED" | "DECLINED" | "WITHDRAWN" | "EXPIRED" | "CHOSEN";
export const QUOTE_TONE: Record<QuoteStatus, "default" | "attn" | "positive" | "critical" | "info"> = { OPEN: "attn", QUOTED: "info", DECLINED: "default", WITHDRAWN: "default", EXPIRED: "default", CHOSEN: "positive" };

export interface QuoteCargo {
  origin: { countryCode: string; city: string };
  destination: { countryCode: string; city: string };
  readyOn: string | null;
  packageCount: number;
  weightKg: number;
  volumeM3: number | null;
  largestPackageCm: { length: number; width: number; height: number } | null;
  handlingFlags: string[];
  description: string;
  note: string | null;
}

export interface CarrierQuote {
  id: string;
  reference: string;
  status: QuoteStatus;
  route: { id: string; name: string; mode: string };
  carrier: { id: string; name: string };
  cargo: QuoteCargo;
  respondBy: string;
  amountMinor: number | null;
  currency: string | null;
  transitDaysMin: number | null;
  transitDaysMax: number | null;
  collectOn: string | null;
  validUntil: string | null;
  note: string | null;
  declineReason: string | null;
  respondedAt: string | null;
  createdAt: string;
}

const box = "rounded-[var(--radius-m)] border border-line bg-surface-raised p-5 text-sm";
const STATUSES: QuoteStatus[] = ["OPEN", "QUOTED", "CHOSEN", "DECLINED", "EXPIRED", "WITHDRAWN"];

export function CarrierQuotesList() {
  const t = useTranslations("carriers.quotes");
  const format = useFormat();
  const [status, setStatus] = useState<string>("OPEN");
  const [items, setItems] = useState<CarrierQuote[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    call<{ items: CarrierQuote[] }>("GET", `/carrier-quotes${status ? `?status=${status}` : ""}`).then(
      (r) => setItems(r.items),
      (e) => setError((e as Error).message)
    );
  }, [status]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="rb-headline text-[28px]">{t("title")}</h1>
        <p className="mt-1 text-sm text-ink-muted">{t("lead")}</p>
      </div>
      <Accepting />
      <nav className="flex flex-wrap gap-2 text-sm" aria-label={t("filter")}>
        {["", ...STATUSES].map((s) => (
          <button key={s || "all"} type="button" aria-pressed={status === s} onClick={() => setStatus(s)} className={`rounded-full border px-3 py-1 ${status === s ? "border-ink bg-ink text-ink-inverse" : "border-line-strong"}`}>
            {s ? t(`status.${s}`) : t("all")}
          </button>
        ))}
      </nav>
      {error ? <p className="text-sm text-critical">{error}</p> : null}
      <ul className="grid gap-3">
        {items.map((q) => (
          <li key={q.id} className={box}>
            <div className="flex flex-wrap items-center gap-2">
              <Link href={`/partner/quotes/${q.id}`} className="rb-mono font-medium underline">
                {q.reference}
              </Link>
              <Badge variant={QUOTE_TONE[q.status]}>{t(`status.${q.status}`)}</Badge>
              <span className="text-ink-muted">{q.route.name}</span>
            </div>
            <p className="mt-1">
              {q.cargo.origin.city} → {q.cargo.destination.city} · {t("packagesWeight", { count: q.cargo.packageCount, kg: format.number(q.cargo.weightKg) })}
            </p>
            {q.status === "OPEN" ? <p className="text-xs text-ink-muted">{t("answerBy", { when: format.dayTime(q.respondBy) })}</p> : null}
          </li>
        ))}
      </ul>
      {items.length === 0 && !error ? <p className="text-ink-muted">{t("empty")}</p> : null}
    </div>
  );
}

/** Pause or resume new requests; routes still run. */
function Accepting() {
  const t = useTranslations("carriers.quotes");
  const [accepting, setAccepting] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    call<{ application: { status: string; acceptingRequests: boolean } | null }>("GET", "/me/carrier").then(
      (r) => setAccepting(r.application?.status === "APPROVED" ? r.application.acceptingRequests : null),
      () => setAccepting(null)
    );
  }, []);
  // Carriers made by staff before sign-up existed have no application to pause.
  if (accepting === null) return null;
  return (
    <div className={`${box} flex flex-wrap items-center justify-between gap-3`}>
      <p>{accepting ? t("acceptingOn") : t("acceptingOff")}</p>
      <Button
        variant="secondary"
        loading={busy}
        onClick={async () => {
          setBusy(true);
          try {
            const r = await call<{ application: { acceptingRequests: boolean } }>("PUT", "/me/carrier/accepting", { accepting: !accepting });
            setAccepting(r.application.acceptingRequests);
          } finally {
            setBusy(false);
          }
        }}
      >
        {accepting ? t("pause") : t("resume")}
      </Button>
    </div>
  );
}

export function CargoFacts({ cargo }: { cargo: QuoteCargo }) {
  const t = useTranslations("carriers.quotes");
  const tl = useTranslations("labels");
  const locale = useLocale();
  const format = useFormat();
  const place = (p: { city: string; countryCode: string }) => `${p.city}, ${countryName(p.countryCode, locale)}`;
  return (
    <dl className="grid gap-2 sm:grid-cols-[10rem_1fr]">
      <dt className="text-ink-muted">{t("from")}</dt>
      <dd>{place(cargo.origin)}</dd>
      <dt className="text-ink-muted">{t("to")}</dt>
      <dd>{place(cargo.destination)}</dd>
      {cargo.readyOn ? (
        <>
          <dt className="text-ink-muted">{t("readyOn")}</dt>
          <dd>{format.date(cargo.readyOn)}</dd>
        </>
      ) : null}
      <dt className="text-ink-muted">{t("goods")}</dt>
      <dd className="whitespace-pre-line">{cargo.description}</dd>
      <dt className="text-ink-muted">{t("load")}</dt>
      <dd>
        {t("packagesWeight", { count: cargo.packageCount, kg: format.number(cargo.weightKg) })}
        {cargo.volumeM3 ? ` · ${format.number(cargo.volumeM3)} m³` : ""}
        {cargo.largestPackageCm ? ` · ${t("largest", { l: cargo.largestPackageCm.length, w: cargo.largestPackageCm.width, h: cargo.largestPackageCm.height })}` : ""}
      </dd>
      {cargo.handlingFlags.length ? (
        <>
          <dt className="text-ink-muted">{t("care")}</dt>
          <dd>{cargo.handlingFlags.map((f) => tl(`handlingFlag.${f}` as "handlingFlag.FRAGILE")).join(", ")}</dd>
        </>
      ) : null}
      {cargo.note ? (
        <>
          <dt className="text-ink-muted">{t("note")}</dt>
          <dd className="whitespace-pre-line">{cargo.note}</dd>
        </>
      ) : null}
    </dl>
  );
}

export function CarrierQuoteDetail({ id }: { id: string }) {
  const t = useTranslations("carriers.quotes");
  const format = useFormat();
  const [q, setQ] = useState<CarrierQuote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(() => call<CarrierQuote>("GET", `/carrier-quotes/${id}`).then(setQ, (e) => setError((e as Error).message)), [id]);
  useEffect(() => {
    load();
  }, [load]);

  if (!q) return error ? <p className="text-sm text-critical">{error}</p> : <p className="text-sm text-ink-muted">…</p>;
  const open = (q.status === "OPEN" && new Date(q.respondBy) > new Date()) || q.status === "QUOTED";

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link href="/partner/quotes" className="text-sm text-ink-muted hover:text-ink">
          ← {t("title")}
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="rb-headline rb-mono text-[26px]">{q.reference}</h1>
          <Badge variant={QUOTE_TONE[q.status]}>{t(`status.${q.status}`)}</Badge>
        </div>
        <p className="mt-1 text-sm text-ink-muted">{q.route.name}</p>
      </div>
      {error ? <p className="text-sm text-critical">{error}</p> : null}
      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <section className={box} aria-labelledby="quote-cargo">
          <h2 id="quote-cargo" className="rb-title mb-3">
            {t("cargo")}
          </h2>
          <CargoFacts cargo={q.cargo} />
          {q.status === "OPEN" ? <p className="mt-3 text-ink-muted">{t("answerBy", { when: format.dayTime(q.respondBy) })}</p> : null}
        </section>
        <aside className="flex flex-col gap-4">
          {q.amountMinor != null && q.currency ? (
            <section className={box} aria-labelledby="quote-yours">
              <h2 id="quote-yours" className="rb-label mb-2">
                {t("yourPrice")}
              </h2>
              <p className="rb-numeral text-lg font-semibold">
                {format.number(toMajor(q.amountMinor, q.currency))} {q.currency}
              </p>
              <p>{t("transit", { min: q.transitDaysMin ?? 0, max: q.transitDaysMax ?? 0 })}</p>
              {q.collectOn ? <p>{t("collectOnValue", { date: format.date(q.collectOn) })}</p> : null}
              {q.validUntil ? <p className="text-ink-muted">{t("validUntilValue", { date: format.date(q.validUntil) })}</p> : null}
              {q.status === "CHOSEN" ? <p className="mt-2 font-medium">{t("chosen")}</p> : null}
            </section>
          ) : null}
          {q.declineReason ? <p className={box}>{t("declinedBecause", { reason: q.declineReason })}</p> : null}
          {open ? <AnswerForm quote={q} onDone={setQ} /> : null}
        </aside>
      </div>
    </div>
  );
}

function AnswerForm({ quote: q, onDone }: { quote: CarrierQuote; onDone: (q: CarrierQuote) => void }) {
  const t = useTranslations("carriers.quotes");
  const [f, setF] = useState({
    amount: q.amountMinor != null && q.currency ? String(toMajor(q.amountMinor, q.currency)) : "",
    currency: q.currency ?? "XOF",
    transitDaysMin: String(q.transitDaysMin ?? ""),
    transitDaysMax: String(q.transitDaysMax ?? ""),
    collectOn: q.collectOn ?? "",
    validUntil: q.validUntil?.slice(0, 10) ?? "",
    note: q.note ?? "",
  });
  const [reason, setReason] = useState("");
  const [declining, setDeclining] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }));

  async function run(fn: () => Promise<CarrierQuote>) {
    setBusy(true);
    setError(null);
    try {
      onDone(await fn());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function answer(e: FormEvent) {
    e.preventDefault();
    const currency = f.currency.trim().toUpperCase();
    const amountMinor = toMinor(f.amount, currency);
    if (amountMinor == null || amountMinor <= 0) {
      setError(t("amountInvalid"));
      return;
    }
    run(() =>
      call<CarrierQuote>("POST", `/carrier-quotes/${q.id}/answer`, {
        amountMinor,
        currency,
        transitDaysMin: Number(f.transitDaysMin),
        transitDaysMax: Number(f.transitDaysMax),
        ...(f.collectOn ? { collectOn: f.collectOn } : {}),
        ...(f.validUntil ? { validUntil: `${f.validUntil}T23:59:59.000Z` } : {}),
        ...(f.note.trim() ? { note: f.note.trim() } : {}),
      })
    );
  }

  return (
    <>
      <form onSubmit={answer} className={`${box} grid gap-3`} aria-labelledby="quote-answer">
        <h2 id="quote-answer" className="rb-label">
          {q.status === "QUOTED" ? t("change") : t("answer")}
        </h2>
        <p className="text-xs text-ink-muted">{t("answerHint")}</p>
        <div className="grid grid-cols-[1fr_6rem] gap-3">
          <Field label={t("amount")} required>
            <input className={input} inputMode="decimal" required value={f.amount} onChange={set("amount")} />
          </Field>
          <Field label={t("currency")} required>
            <input className={`${input} uppercase`} required minLength={3} maxLength={3} value={f.currency} onChange={set("currency")} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("transitMin")} required>
            <input className={input} type="number" min={0} max={365} required value={f.transitDaysMin} onChange={set("transitDaysMin")} />
          </Field>
          <Field label={t("transitMax")} required>
            <input className={input} type="number" min={0} max={365} required value={f.transitDaysMax} onChange={set("transitDaysMax")} />
          </Field>
          <Field label={t("collectOn")}>
            <input className={input} type="date" value={f.collectOn} onChange={set("collectOn")} />
          </Field>
          <Field label={t("validUntil")} hint={t("validUntilHint")}>
            <input className={input} type="date" value={f.validUntil} onChange={set("validUntil")} />
          </Field>
        </div>
        <Field label={t("noteToUs")}>
          <textarea className={`${input} h-auto py-2`} rows={2} maxLength={1000} value={f.note} onChange={set("note")} />
        </Field>
        {error ? (
          <p role="alert" className="text-critical">
            {error}
          </p>
        ) : null}
        <Button type="submit" variant="primary" loading={busy}>
          {q.status === "QUOTED" ? t("sendChange") : t("send")}
        </Button>
      </form>
      <div className={`${box} grid gap-3`}>
        {!declining ? (
          <button type="button" className="justify-self-start underline" onClick={() => setDeclining(true)}>
            {t("decline")}
          </button>
        ) : (
          <form
            className="grid gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              run(() => call<CarrierQuote>("POST", `/carrier-quotes/${q.id}/decline`, { reason: reason.trim() }));
            }}
          >
            <Field label={t("declineWhy")} required>
              <input className={input} required minLength={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
            </Field>
            <Button type="submit" variant="secondary" loading={busy} disabled={reason.trim().length < 3}>
              {t("decline")}
            </Button>
          </form>
        )}
      </div>
    </>
  );
}
