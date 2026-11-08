"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { Field, input } from "@/components/ui/form/Form";
import { call } from "@/components/checkout/http";
import { useFormat } from "@/lib/format";
import { toMajor } from "@/lib/currency";
import { QUOTE_TONE, QuoteStatus } from "@/components/carriers/CarrierQuotes";

// Carriers for a freight request (ADR-081): which routes can move it, asking
// some for their price, and their answers. Prices here are what carriers
// charge Tracecart: staff only. Matching contacts nobody; asking does.

const FLAGS = ["BATTERY", "LIQUID", "TEMPERATURE_SENSITIVE", "FRAGILE", "MEDICAL_DEVICE", "DANGEROUS_GOODS"] as const;
const box = "rounded-[var(--radius-m)] border border-line bg-surface-raised p-5 text-sm";

type Price = { priced: true; amount: number; currency: string; chargeableWeightKg: number } | { priced: false; reason: string };

interface RouteMatch {
  serviceId: string;
  name: string;
  mode: string;
  carrier: { id: string; name: string };
  from: { city: string; country: string } | null;
  to: { city: string | null; country: string };
  departureDays: number[];
  eligible: boolean;
  blockers: string[];
  unchecked: string[];
  departsAt: string;
  etaFrom: string;
  etaTo: string;
  ratePrice: Price;
  asked: QuoteStatus | null;
}

interface Matches {
  cargo: { packageCount: number | null; weightKg: number | null; volumeM3: number | null; largestPackageCm: { length: number; width: number; height: number } | null; handlingFlags: string[]; description: string };
  routes: RouteMatch[];
}

export interface CarrierRequest {
  id: string;
  reference: string;
  status: QuoteStatus;
  route: { id: string; name: string; mode: string };
  carrier: { id: string; name: string };
  respondBy: string;
  sentBy: string;
  amountMinor: number | null;
  currency: string | null;
  transitDaysMin: number | null;
  transitDaysMax: number | null;
  collectOn: string | null;
  validUntil: string | null;
  note: string | null;
  declineReason: string | null;
}

const WAITING: QuoteStatus[] = ["OPEN", "QUOTED"];

export function FreightCarriers({ reference, requests, canAsk, open, chosenId, onChoose, onChanged }: { reference: string; requests: CarrierRequest[]; canAsk: boolean; open: boolean; chosenId: string | null; onChoose: (r: CarrierRequest | null) => void; onChanged: () => void }) {
  const t = useTranslations("freightAdmin.carriers");
  const tl = useTranslations("labels");
  const format = useFormat();
  const [m, setM] = useState<Matches | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [cargo, setCargo] = useState({ packageCount: "", weightKg: "", volumeM3: "", description: "", note: "", hours: "48" });
  const [flags, setFlags] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await call<Matches>("GET", `/freight-requests/${reference}/carriers`);
      setM(res);
      setCargo((c) => ({
        ...c,
        packageCount: c.packageCount || String(res.cargo.packageCount ?? ""),
        weightKg: c.weightKg || String(res.cargo.weightKg ?? ""),
        volumeM3: c.volumeM3 || String(res.cargo.volumeM3 ?? ""),
        description: c.description || res.cargo.description,
      }));
      setFlags((f) => (f.length ? f : res.cargo.handlingFlags));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [reference]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const money = (amount: number, currency: string) => `${format.number(amount)} ${currency}`;
  const set = (k: keyof typeof cargo) => (e: { target: { value: string } }) => setCargo((c) => ({ ...c, [k]: e.target.value }));

  async function ask(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await call("POST", `/freight-requests/${reference}/carrier-requests`, {
        carrierServiceIds: picked,
        respondBy: new Date(Date.now() + Number(cargo.hours) * 3600_000).toISOString(),
        cargo: {
          packageCount: Number(cargo.packageCount),
          weightKg: Number(cargo.weightKg),
          ...(Number(cargo.volumeM3) > 0 ? { volumeM3: Number(cargo.volumeM3) } : {}),
          handlingFlags: flags,
          description: cargo.description.trim(),
        },
        ...(cargo.note.trim() ? { note: cargo.note.trim() } : {}),
      });
      setPicked([]);
      await load();
      onChanged();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function withdraw(id: string) {
    setError(null);
    try {
      await call("POST", `/freight-requests/${reference}/carrier-requests/${id}/withdraw`);
      if (chosenId === id) onChoose(null);
      await load();
      onChanged();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <section className="flex flex-col gap-4" aria-labelledby="freight-carriers">
      <div>
        <h2 id="freight-carriers" className="rb-title">
          {t("title")}
        </h2>
        <p className="mt-1 text-ink-muted">{t("lead")}</p>
      </div>
      {error ? (
        <p role="alert" className="text-critical">
          {error}
        </p>
      ) : null}

      {requests.length ? (
        <div className={box}>
          <h3 className="rb-label mb-2">{t("asked")}</h3>
          <ul className="divide-y divide-line">
            {requests.map((r) => (
              <li key={r.id} className="flex flex-col gap-1 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{r.carrier.name}</span>
                  <span className="text-ink-muted">{r.route.name}</span>
                  <Badge variant={QUOTE_TONE[r.status]}>{t(`status.${r.status}`)}</Badge>
                  {chosenId === r.id ? <Badge variant="positive">{t("inQuote")}</Badge> : null}
                </div>
                {r.amountMinor != null && r.currency ? (
                  <p>
                    <span className="rb-numeral font-medium">{money(toMajor(r.amountMinor, r.currency), r.currency)}</span> · {t("transit", { min: r.transitDaysMin ?? 0, max: r.transitDaysMax ?? 0 })}
                    {r.collectOn ? ` · ${t("collectOn", { date: format.date(r.collectOn) })}` : ""}
                    {r.validUntil ? ` · ${t("validUntil", { date: format.date(r.validUntil) })}` : ""}
                  </p>
                ) : null}
                {r.status === "OPEN" ? <p className="text-xs text-ink-muted">{t("answerBy", { when: format.dayTime(r.respondBy) })}</p> : null}
                {r.note ? <p className="text-ink-muted">{r.note}</p> : null}
                {r.declineReason ? <p className="text-ink-muted">{t("declined", { reason: r.declineReason })}</p> : null}
                {canAsk && open ? (
                  <div className="flex flex-wrap gap-3">
                    {r.status === "QUOTED" && chosenId !== r.id ? (
                      <button type="button" className="underline" onClick={() => onChoose(r)}>
                        {t("use")}
                      </button>
                    ) : null}
                    {WAITING.includes(r.status) ? (
                      <button type="button" className="text-ink-muted underline" onClick={() => withdraw(r.id)}>
                        {t("withdraw")}
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {m ? (
        <form onSubmit={ask} className={`${box} flex flex-col gap-4`}>
          <h3 className="rb-label">{t("routes")}</h3>
          {m.routes.length === 0 ? <p className="text-ink-muted">{t("noRoutes")}</p> : null}
          <ul className="divide-y divide-line">
            {m.routes.map((r) => {
              const pending = r.asked != null && WAITING.includes(r.asked);
              const choosable = canAsk && open && r.eligible && !pending;
              return (
                <li key={r.serviceId} className="flex gap-3 py-3">
                  <input
                    type="checkbox"
                    className="mt-1"
                    aria-label={t("pick", { route: r.name })}
                    disabled={!choosable}
                    checked={picked.includes(r.serviceId)}
                    onChange={(e) => setPicked(e.target.checked ? [...picked, r.serviceId] : picked.filter((x) => x !== r.serviceId))}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{r.carrier.name}</span>
                      <span className="text-ink-muted">
                        {r.name} · {tl(`transportMode.${r.mode}` as "transportMode.ROAD")}
                      </span>
                      {r.eligible ? <Badge variant="positive">{t("canTake")}</Badge> : <Badge variant="default">{t("cannotTake")}</Badge>}
                      {r.asked ? <Badge variant={QUOTE_TONE[r.asked]}>{t(`status.${r.asked}`)}</Badge> : null}
                    </div>
                    {r.blockers.length ? <p className="text-ink-muted">{r.blockers.map((b) => tl(`routeBlocker.${b}` as "routeBlocker.inactive")).join(", ")}</p> : null}
                    {r.unchecked.length ? <p className="text-xs text-ink-muted">{r.unchecked.map((u) => tl(`routeUnchecked.${u}` as "routeUnchecked.weight")).join(", ")}</p> : null}
                    <p className="text-xs text-ink-muted">
                      {t("window", { departs: format.date(r.departsAt), from: format.date(r.etaFrom), to: format.date(r.etaTo) })}
                      {" · "}
                      {r.ratePrice.priced ? t("rateCard", { price: money(r.ratePrice.amount, r.ratePrice.currency) }) : t("noRateCard")}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>

          {canAsk && open ? (
            <fieldset className="grid gap-3" disabled={picked.length === 0}>
              <legend className="rb-label mb-1">{t("whatTheySee")}</legend>
              <p className="text-xs text-ink-muted">{t("whatTheySeeHint")}</p>
              <div className="grid grid-cols-3 gap-3">
                <Field label={t("packages")} required>
                  <input className={input} type="number" min={1} required value={cargo.packageCount} onChange={set("packageCount")} />
                </Field>
                <Field label={t("weight")} required>
                  <input className={input} type="number" min={0.1} step="any" required value={cargo.weightKg} onChange={set("weightKg")} />
                </Field>
                <Field label={t("volume")}>
                  <input className={input} type="number" min={0} step="any" value={cargo.volumeM3} onChange={set("volumeM3")} />
                </Field>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                {FLAGS.map((f) => (
                  <label key={f} className="flex items-center gap-2">
                    <input type="checkbox" checked={flags.includes(f)} onChange={(e) => setFlags(e.target.checked ? [...flags, f] : flags.filter((x) => x !== f))} />
                    {tl(`handlingFlag.${f}`)}
                  </label>
                ))}
              </div>
              <Field label={t("description")} required hint={t("descriptionHint")}>
                <textarea className={`${input} h-auto py-2`} rows={2} required minLength={3} maxLength={1000} value={cargo.description} onChange={set("description")} />
              </Field>
              <Field label={t("note")}>
                <input className={input} maxLength={1000} value={cargo.note} onChange={set("note")} />
              </Field>
              <Field label={t("replyWithin")}>
                <select className={input} value={cargo.hours} onChange={set("hours")}>
                  {["24", "48", "72", "168"].map((h) => (
                    <option key={h} value={h}>
                      {t(`hours.${h}` as "hours.24")}
                    </option>
                  ))}
                </select>
              </Field>
              <Button type="submit" variant="primary" loading={busy} className="justify-self-start">
                {t("ask", { count: picked.length })}
              </Button>
            </fieldset>
          ) : null}
        </form>
      ) : null}
    </section>
  );
}
