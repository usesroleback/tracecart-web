"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useFormat } from "@/lib/format";
import { toMajor, toMinor } from "@/lib/currency";
import { Badge } from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { Field, input } from "@/components/ui/form/Form";
import { call } from "@/components/checkout/http";

const STATUSES = ["PLANNED", "PICKING", "PACKED", "LABELLED", "HANDED_OVER", "IN_TRANSIT", "AT_PICKUP_POINT", "OUT_FOR_DELIVERY", "DELIVERY_FAILED", "DELIVERED", "RETURNING", "RETURNED", "LOST", "CANCELLED"] as const;
type Status = (typeof STATUSES)[number];

const TONE: Record<Status, "positive" | "attn" | "default" | "critical" | "info"> = {
  PLANNED: "default",
  PICKING: "attn",
  PACKED: "attn",
  LABELLED: "attn",
  HANDED_OVER: "info",
  IN_TRANSIT: "info",
  AT_PICKUP_POINT: "info",
  OUT_FOR_DELIVERY: "info",
  DELIVERY_FAILED: "critical",
  DELIVERED: "positive",
  RETURNING: "attn",
  RETURNED: "default",
  LOST: "critical",
  CANCELLED: "default",
};

// What can happen next on the road, as the API's machine allows it (ADR-040).
// Being delivered isn't here: it takes proof, and any cash (ADR-041).
type RoadAction = "transit" | "out_for_delivery" | "at_pickup_point" | "delivery_failed" | "return_start" | "returned" | "lost";
const ROAD: Partial<Record<Status, RoadAction[]>> = {
  HANDED_OVER: ["transit", "out_for_delivery", "at_pickup_point", "lost"],
  IN_TRANSIT: ["out_for_delivery", "at_pickup_point", "lost"],
  AT_PICKUP_POINT: ["return_start", "lost"],
  OUT_FOR_DELIVERY: ["delivery_failed", "lost"],
  DELIVERY_FAILED: ["out_for_delivery", "return_start", "lost"],
  RETURNING: ["returned", "lost"],
};
const NEEDS_REASON: RoadAction[] = ["delivery_failed", "lost"];
const CAN_DELIVER: Status[] = ["AT_PICKUP_POINT", "OUT_FOR_DELIVERY"];
const TAKES_NEW_CODE: Status[] = ["AT_PICKUP_POINT", "OUT_FOR_DELIVERY", "DELIVERY_FAILED"];
const ON_THE_ROAD: Status[] = ["HANDED_OVER", "IN_TRANSIT", "AT_PICKUP_POINT", "OUT_FOR_DELIVERY", "DELIVERY_FAILED", "RETURNING"];
const NEWS = ["POSITION_REPORTED", "BORDER_PROCESSING", "CUSTOMS_DOCUMENTS_REQUIRED", "CUSTOMS_CLEARANCE_STARTED", "CUSTOMS_CLEARED", "DESTINATION_HUB_RECEIVED", "DELAY_REPORTED"] as const;

interface Row {
  id: string;
  reference: string;
  status: Status;
  orderReference: string;
  deliveryMethod: string;
  destinationCity: string;
  promiseTo: string;
  warehouse: { code: string; city: string };
  carrier: string | null;
  lineCount: number;
  openExceptions: number;
  createdAt: string;
}

/** Shipments in the console: what the API lets this person work on, newest first. */
export function ShipmentsList() {
  const t = useTranslations("shipments");
  const format = useFormat();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [problems, setProblems] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (after: string | null, query: string, st: string, withProblems: boolean) => {
    const p = new URLSearchParams({ limit: "50" });
    if (withProblems) p.set("problems", "open");
    if (query.trim()) p.set("q", query.trim());
    if (st) p.set("status", st);
    if (after) p.set("cursor", after);
    try {
      const res = await call<{ items: Row[]; nextCursor: string | null }>("GET", `/shipments?${p}`);
      setRows((prev) => (after ? [...prev, ...res.items] : res.items));
      setCursor(res.nextCursor);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(null, "", "", false);
  }, [load]);

  return (
    <div>
      <h1 className="rb-headline mb-1 text-[28px]">{t("title")}</h1>
      <p className="mb-6 text-sm text-ink-muted">{t("lead")}</p>
      <form
        role="search"
        className="mb-4 flex flex-wrap gap-2"
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          load(null, q, status, problems);
        }}
      >
        <input className={`${input} max-w-sm`} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search")} aria-label={t("search")} />
        <select
          className={`${input} max-w-[14rem]`}
          value={status}
          aria-label={t("status")}
          onChange={(e) => {
            setStatus(e.target.value);
            load(null, q, e.target.value, problems);
          }}
        >
          <option value="">{t("allStatuses")}</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {t(`statuses.${s}`)}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={problems}
            onChange={(e) => {
              setProblems(e.target.checked);
              load(null, q, status, e.target.checked);
            }}
          />
          {t("onlyProblems")}
        </label>
        <Button type="submit" variant="secondary">
          {t("find")}
        </Button>
      </form>
      {error ? <p className="mb-4 text-sm text-critical">{error}</p> : null}
      <div className="overflow-x-auto rounded-[var(--radius-m)] border border-line bg-surface-raised">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line text-ink-muted">
            <tr>
              <th className="px-4 py-3 font-medium">{t("columns.shipment")}</th>
              <th className="px-4 py-3 font-medium">{t("columns.status")}</th>
              <th className="px-4 py-3 font-medium">{t("columns.from")}</th>
              <th className="px-4 py-3 font-medium">{t("columns.to")}</th>
              <th className="px-4 py-3 font-medium">{t("columns.carrier")}</th>
              <th className="px-4 py-3 font-medium">{t("columns.promise")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-surface-sunken">
                <td className="px-4 py-3">
                  <Link href={`/shipments/${r.id}`} className="rb-mono font-medium text-ink hover:underline">
                    {r.reference}
                  </Link>
                  <p className="text-xs text-ink-muted">{t("orderItems", { reference: r.orderReference, count: r.lineCount })}</p>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={TONE[r.status]}>{t(`statuses.${r.status}`)}</Badge>
                  {r.openExceptions ? <p className="mt-1 text-xs text-critical">{t("problems", { count: r.openExceptions })}</p> : null}
                </td>
                <td className="px-4 py-3">{r.warehouse.city}</td>
                <td className="px-4 py-3">{r.destinationCity}</td>
                <td className="px-4 py-3 text-ink-muted">{r.carrier ?? t("noCarrier")}</td>
                <td className="px-4 py-3 text-ink-muted">{format.shortDate(r.promiseTo)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && !error ? <p className="px-4 py-8 text-center text-ink-muted">{t("empty")}</p> : null}
      </div>
      {cursor ? (
        <Button variant="secondary" className="mt-4" onClick={() => load(cursor, q, status, problems)}>
          {t("more")}
        </Button>
      ) : null}
    </div>
  );
}

interface Detail {
  id: string;
  reference: string;
  status: Status;
  orderId: string;
  orderReference: string;
  orderStatus: string;
  deliveryMethod: string;
  destination: { recipientName: string | null; phone: string | null; countryCode: string; city: string; address: string | null; landmark: string | null; pickupPoint: string | null };
  promise: { from: string; to: string };
  eta: { from: string | null; to: string | null } | null;
  warehouse: { name: string; city: string; countryCode: string };
  carrier: { id: string; name: string } | null;
  carrierService: { id: string; name: string; mode: string } | null;
  externalRef: string | null;
  packed: { weightGrams: number | null; packageCount: number | null };
  lines: { orderLineId: string; sku: string; title: string; quantity: number; bin: string | null }[];
  events: { id: string; milestone: string; occurredAt: string; city: string | null; customerNote: string | null; internalNote: string | null; reason: string | null }[];
  openExceptions: { id: string; type: string; summary: string }[];
  carrierCost?: { amountMinor: number; currency: string } | null;
  proofs: { id: string; kind: "CODE" | "PHOTO" | "SIGNATURE"; recipientName: string | null; hasFile: boolean; createdAt: string }[];
  collect?: { amountMinor: number; currency: string; collectedAt: string | null };
}

interface RateOption {
  serviceId: string;
  name: string;
  mode: string;
  eligible: boolean;
  blockers: string[];
  eta: { from: string; to: string };
  meetsPromise: boolean | null;
  cost: { amount: number; currency: string } | null;
}

const box = "rounded-[var(--radius-m)] border border-line bg-surface-raised p-5 text-sm";

/** One shipment: the pick list and, for those who may, the next step of its way. */
export function ShipmentDetail({ id, canPack, canRoute, canRecord, canProve, canReissue, canSeeOrder }: { id: string; canPack: boolean; canRoute: boolean; canRecord: boolean; canProve: boolean; canReissue: boolean; canSeeOrder: boolean }) {
  const t = useTranslations("shipments");
  const format = useFormat();
  const [s, setS] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    call<Detail>("GET", `/shipments/${id}`)
      .then(setS)
      .catch((e) => setError((e as Error).message));
  }, [id]);

  async function act(fn: () => Promise<Detail>) {
    setBusy(true);
    setError(null);
    try {
      setS(await fn());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (error && !s) return <p className="text-critical">{error}</p>;
  if (!s) return <p className="text-ink-muted">…</p>;
  const post = (path: string, body?: unknown) => act(() => call<Detail>("POST", `/shipments/${s.id}/${path}`, body));
  const d = s.destination;
  const hasLabel = !["PLANNED", "PICKING", "PACKED", "CANCELLED"].includes(s.status);
  const road = (ROAD[s.status] ?? []).filter((a) => !(s.deliveryMethod === "PICKUP" && a === "out_for_delivery") && !(s.deliveryMethod === "HOME" && a === "at_pickup_point"));
  const money = (minor: number, currency: string) => `${format.number(toMajor(minor, currency))} ${currency}`;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/shipments" className="text-sm text-ink-muted hover:text-ink">
          ← {t("title")}
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="rb-headline rb-mono text-[26px]">{s.reference}</h1>
          <Badge variant={TONE[s.status]}>{t(`statuses.${s.status}`)}</Badge>
        </div>
        <p className="mt-1 text-sm text-ink-muted">
          {canSeeOrder ? (
            <Link href={`/store-orders/${s.orderId}`} className="underline">
              {t("order", { reference: s.orderReference })}
            </Link>
          ) : (
            t("order", { reference: s.orderReference })
          )}
          {" · "}
          {t("promise", { from: format.shortDate(s.promise.from), to: format.shortDate(s.promise.to) })}
        </p>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-critical">
          {error}
        </p>
      ) : null}
      {s.orderStatus === "ON_HOLD" ? <p className={`${box} text-critical`}>{t("onHold")}</p> : null}
      {s.openExceptions.length ? (
        <ul className={`${box} border-critical`}>
          {s.openExceptions.map((x) => (
            <li key={x.id} className="text-critical">
              {t(`exceptions.${x.type}` as "exceptions.OTHER")} · {x.summary}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <section className="flex flex-col gap-6">
          <div className={box}>
            <h2 className="rb-title mb-3">{t("pickList")}</h2>
            <table className="w-full text-left">
              <thead className="text-ink-muted">
                <tr>
                  <th className="py-2 font-medium">{t("columns.item")}</th>
                  <th className="py-2 font-medium">{t("columns.bin")}</th>
                  <th className="py-2 text-right font-medium">{t("columns.quantity")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {s.lines.map((l) => (
                  <tr key={l.orderLineId}>
                    <td className="py-2">
                      {l.title}
                      <p className="rb-mono-s text-ink-muted">{l.sku}</p>
                    </td>
                    <td className="rb-mono-s py-2">{l.bin ?? t("noBin")}</td>
                    <td className="rb-numeral py-2 text-right">{l.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={box}>
            <h2 className="rb-title mb-3">{t("tracking")}</h2>
            {s.events.length ? (
              <ol className="space-y-2">
                {[...s.events].reverse().map((e) => (
                  <li key={e.id}>
                    <span className="font-medium">{t(`milestones.${e.milestone}` as "milestones.PACKED")}</span>
                    {e.city ? ` · ${e.city}` : ""}
                    <span className="text-ink-muted"> · {format.dayTime(e.occurredAt)}</span>
                    {[e.reason, e.customerNote, e.internalNote].filter(Boolean).map((n, i) => (
                      <p key={i} className="text-ink-muted">
                        {n}
                      </p>
                    ))}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-ink-muted">{t("noEvents")}</p>
            )}
          </div>
        </section>

        <aside className="flex flex-col gap-4">
          <div className={box}>
            <h2 className="rb-label mb-2">{t("from")}</h2>
            <p>
              {s.warehouse.name}, {s.warehouse.city}
            </p>
            <h2 className="rb-label mb-2 mt-4">{d.pickupPoint ? t("pickupPoint") : t("to")}</h2>
            <p>
              {d.pickupPoint ? (
                <>
                  {d.pickupPoint}
                  <br />
                </>
              ) : null}
              {[d.recipientName, d.phone].filter(Boolean).join(" · ")}
              <br />
              {[d.address, d.city, d.countryCode].filter(Boolean).join(", ")}
              {d.landmark ? (
                <>
                  <br />
                  <span className="text-ink-muted">{d.landmark}</span>
                </>
              ) : null}
            </p>
            <h2 className="rb-label mb-2 mt-4">{t("carrier")}</h2>
            <p>
              {s.carrierService?.name ?? s.carrier?.name ?? t("noCarrier")}
              {s.externalRef ? <span className="rb-mono-s text-ink-muted"> · {s.externalRef}</span> : null}
            </p>
            {s.carrierCost ? <p className="text-ink-muted">{t("carrierCost", { amount: `${format.number(toMajor(s.carrierCost.amountMinor, s.carrierCost.currency))} ${s.carrierCost.currency}` })}</p> : null}
            {hasLabel ? (
              <a href={`/api/tracecart/shipments/${s.id}/label.pdf`} className="mt-3 block font-medium text-ink underline">
                {t("labelPdf")}
              </a>
            ) : null}
          </div>

          {s.collect ? (
            <div className={box}>
              <h2 className="rb-label mb-2">{s.collect.collectedAt ? t("cashCollected") : t("cashToCollect")}</h2>
              <p className="rb-numeral text-[22px]">{money(s.collect.amountMinor, s.collect.currency)}</p>
              {s.collect.collectedAt ? <p className="text-ink-muted">{format.dayTime(s.collect.collectedAt)}</p> : null}
            </div>
          ) : null}
          {s.proofs.length ? (
            <div className={box}>
              <h2 className="rb-label mb-2">{t("proofs")}</h2>
              <ul className="space-y-1">
                {s.proofs.map((p) => (
                  <li key={p.id}>
                    {p.hasFile ? (
                      <a href={`/api/tracecart/shipments/${s.id}/proof/${p.id}/file`} target="_blank" rel="noreferrer" className="underline">
                        {t(`proofKinds.${p.kind}`)}
                      </a>
                    ) : (
                      t(`proofKinds.${p.kind}`)
                    )}
                    {p.recipientName ? ` · ${p.recipientName}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {canPack && s.status === "PLANNED" ? (
            <div className={box}>
              <Button variant="primary" loading={busy} onClick={() => post("pick")}>
                {t("startPicking")}
              </Button>
            </div>
          ) : null}
          {canPack && s.status === "PICKING" ? <PackForm busy={busy} onPack={(body) => post("pack", body)} /> : null}
          {canRoute && ["PLANNED", "PICKING", "PACKED"].includes(s.status) ? <CarrierChoice id={s.id} busy={busy} onAssign={(body) => post("assign", body)} /> : null}
          {canPack && s.status === "PACKED" ? (
            <div className={box}>
              {!s.carrier && !s.carrierService ? <p className="mb-3 text-ink-muted">{t("needCarrier")}</p> : null}
              <Button variant="primary" loading={busy} disabled={!s.carrier && !s.carrierService} onClick={() => post("label")}>
                {t("makeLabel")}
              </Button>
            </div>
          ) : null}
          {canPack && s.status === "LABELLED" ? <HandOverForm busy={busy} onHandOver={(body) => post("handover", body)} /> : null}
          {canRecord && CAN_DELIVER.includes(s.status) ? <DeliverForm key={`deliver-${s.status}`} atPoint={s.status === "AT_PICKUP_POINT"} collect={s.collect} hasFile={s.proofs.some((p) => p.hasFile)} busy={busy} onDeliver={(body) => post("deliver", body)} /> : null}
          {canProve && CAN_DELIVER.includes(s.status) ? <ProofForm busy={busy} onUpload={(body) => post("proof", body)} /> : null}
          {canReissue && TAKES_NEW_CODE.includes(s.status) ? (
            <div className={box}>
              <h2 className="rb-label mb-2">{t("newCode")}</h2>
              <p className="mb-3 text-ink-muted">{t("newCodeHint")}</p>
              <Button variant="secondary" loading={busy} onClick={() => post("collection-code")}>
                {t("newCodeCta")}
              </Button>
            </div>
          ) : null}
          {canRecord && road.length ? <RoadForm key={s.status} actions={road} busy={busy} onAdvance={(body) => post("advance", body)} /> : null}
          {canRecord && ON_THE_ROAD.includes(s.status) ? (
            <NewsForm
              busy={busy}
              onRecord={(body) =>
                act(async () => {
                  const res = await call<{ shipment: Detail }>("POST", `/shipments/${s.id}/events`, body);
                  return res.shipment;
                })
              }
            />
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function PackForm({ busy, onPack }: { busy: boolean; onPack: (body: unknown) => void }) {
  const t = useTranslations("shipments");
  const [kg, setKg] = useState("");
  const [packages, setPackages] = useState("1");
  return (
    <form
      className={`${box} grid gap-3`}
      onSubmit={(e) => {
        e.preventDefault();
        onPack({ weightGrams: Math.round(Number(kg) * 1000), packageCount: Number(packages) });
      }}
    >
      <h2 className="rb-label">{t("pack")}</h2>
      <Field label={t("weightKg")} required>
        <input className={input} type="number" inputMode="decimal" min="0.001" step="0.001" required value={kg} onChange={(e) => setKg(e.target.value)} />
      </Field>
      <Field label={t("packages")} required>
        <input className={input} type="number" inputMode="numeric" min="1" step="1" required value={packages} onChange={(e) => setPackages(e.target.value)} />
      </Field>
      <Button type="submit" variant="primary" loading={busy}>
        {t("packed")}
      </Button>
    </form>
  );
}

function CarrierChoice({ id, busy, onAssign }: { id: string; busy: boolean; onAssign: (body: unknown) => void }) {
  const t = useTranslations("shipments");
  const format = useFormat();
  const [options, setOptions] = useState<RateOption[] | null>(null);
  const [carriers, setCarriers] = useState<{ id: string; name: string }[]>([]);
  const [carrierId, setCarrierId] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([call<{ options: RateOption[] }>("GET", `/shipments/${id}/rates`), call<{ items: { id: string; name: string }[] }>("GET", "/shipments/carriers")])
      .then(([rates, list]) => {
        setOptions(rates.options.filter((o) => o.eligible));
        setCarriers(list.items);
      })
      .catch((e) => setError((e as Error).message));
  }, [id]);

  return (
    <div className={box}>
      <h2 className="rb-label mb-2">{t("chooseCarrier")}</h2>
      {error ? <p className="text-critical">{error}</p> : null}
      {options?.length ? (
        <ul className="mb-3 divide-y divide-line">
          {options.map((o) => (
            <li key={o.serviceId} className="py-2">
              <p className="font-medium">{o.name}</p>
              <p className="text-ink-muted">
                {t("arrives", { from: format.shortDate(o.eta.from), to: format.shortDate(o.eta.to) })}
                {o.cost ? ` · ${format.number(o.cost.amount)} ${o.cost.currency}` : ` · ${t("noRate")}`}
              </p>
              {o.meetsPromise === false ? <p className="text-critical">{t("latePromise")}</p> : null}
              <Button variant="secondary" className="mt-1" loading={busy} onClick={() => onAssign({ carrierServiceId: o.serviceId })}>
                {t("choose")}
              </Button>
            </li>
          ))}
        </ul>
      ) : options ? (
        <p className="mb-3 text-ink-muted">{t("noServices")}</p>
      ) : null}
      {carriers.length ? (
        <form
          className="grid gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            onAssign({ carrierOrganizationId: carrierId });
          }}
        >
          <Field label={t("otherCarrier")}>
            <select className={input} required value={carrierId} onChange={(e) => setCarrierId(e.target.value)}>
              <option value="">{t("pickCarrier")}</option>
              {carriers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Button type="submit" variant="secondary" loading={busy}>
            {t("choose")}
          </Button>
        </form>
      ) : null}
    </div>
  );
}

function HandOverForm({ busy, onHandOver }: { busy: boolean; onHandOver: (body: unknown) => void }) {
  const t = useTranslations("shipments");
  const [ref, setRef] = useState("");
  return (
    <form
      className={`${box} grid gap-3`}
      onSubmit={(e) => {
        e.preventDefault();
        onHandOver(ref.trim() ? { externalRef: ref.trim() } : {});
      }}
    >
      <h2 className="rb-label">{t("handOver")}</h2>
      <p className="text-ink-muted">{t("handOverHint")}</p>
      <Field label={t("externalRef")}>
        <input className={input} value={ref} maxLength={120} onChange={(e) => setRef(e.target.value)} />
      </Field>
      <Button type="submit" variant="primary" loading={busy}>
        {t("handOverCta")}
      </Button>
    </form>
  );
}

function RoadForm({ actions, busy, onAdvance }: { actions: RoadAction[]; busy: boolean; onAdvance: (body: unknown) => void }) {
  const t = useTranslations("shipments");
  const [action, setAction] = useState<RoadAction>(actions[0]);
  const [city, setCity] = useState("");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const needsReason = NEEDS_REASON.includes(action);
  return (
    <form
      className={`${box} grid gap-3`}
      onSubmit={(e) => {
        e.preventDefault();
        onAdvance({ action, ...(city.trim() ? { city: city.trim() } : {}), ...(reason.trim() ? { reason: reason.trim() } : {}), ...(note.trim() ? { customerNote: note.trim() } : {}) });
      }}
    >
      <h2 className="rb-label">{t("nextStep")}</h2>
      <Field label={t("whatHappened")} required>
        <select className={input} required value={action} onChange={(e) => setAction(e.target.value as RoadAction)}>
          {actions.map((a) => (
            <option key={a} value={a}>
              {t(`actions.${a}`)}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t("city")}>
        <input className={input} value={city} maxLength={120} onChange={(e) => setCity(e.target.value)} />
      </Field>
      {needsReason ? (
        <Field label={t("reason")} required>
          <input className={input} required value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)} />
        </Field>
      ) : null}
      <Field label={t("customerNote")} hint={t("customerNoteHint")}>
        <input className={input} value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <Button type="submit" variant="primary" loading={busy}>
        {t("record")}
      </Button>
    </form>
  );
}

/** Delivered, with the customer's code and any cash. The API checks both, and refuses a wrong amount. */
function DeliverForm({ atPoint, collect, hasFile, busy, onDeliver }: { atPoint: boolean; collect?: Detail["collect"]; hasFile: boolean; busy: boolean; onDeliver: (body: unknown) => void }) {
  const t = useTranslations("shipments");
  const [code, setCode] = useState("");
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const collectedMinor = collect ? toMinor(amount, collect.currency) : null;
  const wrongAmount = !!collect && amount !== "" && collectedMinor !== collect.amountMinor;
  return (
    <form
      className={`${box} grid gap-3`}
      onSubmit={(e) => {
        e.preventDefault();
        onDeliver({ ...(code.trim() ? { code: code.trim() } : {}), ...(collect && collectedMinor != null ? { collectedMinor } : {}), ...(recipient.trim() ? { recipientName: recipient.trim() } : {}) });
      }}
    >
      <h2 className="rb-label">{t("deliver")}</h2>
      <Field label={t("code")} required={atPoint || !hasFile} hint={atPoint ? t("codeHintPoint") : t("codeHintHome")}>
        <input className={`${input} rb-mono`} inputMode="numeric" autoComplete="off" pattern="[0-9]{6}" maxLength={6} required={atPoint || !hasFile} value={code} onChange={(e) => setCode(e.target.value)} />
      </Field>
      {collect ? (
        <Field label={t("amountCollected", { currency: collect.currency })} required hint={wrongAmount ? t("amountMustMatch") : undefined}>
          <input className={input} inputMode="decimal" required value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
      ) : null}
      <Field label={t("recipient")}>
        <input className={input} maxLength={120} value={recipient} onChange={(e) => setRecipient(e.target.value)} />
      </Field>
      <Button type="submit" variant="primary" loading={busy} disabled={wrongAmount}>
        {t("deliverCta")}
      </Button>
    </form>
  );
}

function ProofForm({ busy, onUpload }: { busy: boolean; onUpload: (body: FormData) => void }) {
  const t = useTranslations("shipments");
  const [kind, setKind] = useState<"PHOTO" | "SIGNATURE">("PHOTO");
  const [file, setFile] = useState<File | null>(null);
  return (
    <form
      className={`${box} grid gap-3`}
      onSubmit={(e) => {
        e.preventDefault();
        if (!file) return;
        const form = new FormData();
        form.append("kind", kind);
        form.append("file", file);
        onUpload(form);
        setFile(null);
        e.currentTarget.reset();
      }}
    >
      <h2 className="rb-label">{t("addProof")}</h2>
      <Field label={t("proofKind")} required>
        <select className={input} value={kind} onChange={(e) => setKind(e.target.value as "PHOTO" | "SIGNATURE")}>
          <option value="PHOTO">{t("proofKinds.PHOTO")}</option>
          <option value="SIGNATURE">{t("proofKinds.SIGNATURE")}</option>
        </select>
      </Field>
      <Field label={t("proofFile")} required>
        <input className={input} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" required onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      </Field>
      <Button type="submit" variant="secondary" loading={busy}>
        {t("addProofCta")}
      </Button>
    </form>
  );
}

function NewsForm({ busy, onRecord }: { busy: boolean; onRecord: (body: unknown) => void }) {
  const t = useTranslations("shipments");
  const [milestone, setMilestone] = useState<(typeof NEWS)[number]>("POSITION_REPORTED");
  const [city, setCity] = useState("");
  const [reason, setReason] = useState("");
  const needsReason = milestone === "DELAY_REPORTED";
  return (
    <form
      className={`${box} grid gap-3`}
      onSubmit={(e) => {
        e.preventDefault();
        onRecord({ milestone, ...(city.trim() ? { city: city.trim() } : {}), ...(reason.trim() ? { reason: reason.trim() } : {}) });
      }}
    >
      <h2 className="rb-label">{t("news")}</h2>
      <Field label={t("whatHappened")} required>
        <select className={input} required value={milestone} onChange={(e) => setMilestone(e.target.value as (typeof NEWS)[number])}>
          {NEWS.map((m) => (
            <option key={m} value={m}>
              {t(`milestones.${m}`)}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t("city")}>
        <input className={input} value={city} maxLength={120} onChange={(e) => setCity(e.target.value)} />
      </Field>
      {needsReason ? (
        <Field label={t("reason")} required>
          <input className={input} required value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)} />
        </Field>
      ) : null}
      <Button type="submit" variant="secondary" loading={busy}>
        {t("record")}
      </Button>
    </form>
  );
}

export interface CustomerShipment {
  reference: string;
  status: Status;
  carrier: string | null;
  eta: { from: string | null; to: string | null } | null;
  collectionCode: string | null;
  lines: { sku: string; title: string; quantity: number }[];
  events: { milestone: string; occurredAt: string; city: string | null; note: string | null; reason: string | null }[];
}

/** A customer's parcels on their order page: where each one is, latest news first. */
export function OrderShipments({ shipments, boxClass }: { shipments: CustomerShipment[]; boxClass: string }) {
  const t = useTranslations("shipments");
  const format = useFormat();
  if (!shipments.length) return null;
  return (
    <>
      {shipments.map((s) => (
        <div key={s.reference} className={boxClass}>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h2 className="rb-label">{t("parcel")}</h2>
            <Badge variant={TONE[s.status]}>{t(`statuses.${s.status}`)}</Badge>
          </div>
          <p className="rb-mono-s text-ink-muted">
            {s.reference}
            {s.carrier ? ` · ${s.carrier}` : ""}
          </p>
          {shipments.length > 1 ? <p className="mt-1 text-sm text-ink-muted">{s.lines.map((l) => `${l.title} × ${l.quantity}`).join(", ")}</p> : null}
          {s.eta?.from && s.eta.to ? <p className="mt-2 text-sm">{t("arrives", { from: format.shortDate(s.eta.from), to: format.shortDate(s.eta.to) })}</p> : null}
          {s.collectionCode ? (
            <div className="mt-3">
              <p className="text-sm text-ink-muted">{s.status === "AT_PICKUP_POINT" ? t("yourCodePoint") : t("yourCodeHome")}</p>
              <p className="rb-mono text-[24px] font-medium tracking-[0.2em]">{s.collectionCode}</p>
            </div>
          ) : null}
          {s.events.length ? (
            <ol className="mt-3 grid gap-1.5 text-sm">
              {s.events.map((e, i) => (
                <li key={i}>
                  <span>{t(`milestones.${e.milestone}` as "milestones.PACKED")}</span>
                  {e.city ? ` · ${e.city}` : ""}
                  <span className="text-ink-muted"> · {format.dateTime(e.occurredAt)}</span>
                  {[e.reason, e.note].filter(Boolean).map((n, j) => (
                    <p key={j} className="text-ink-muted">
                      {n}
                    </p>
                  ))}
                </li>
              ))}
            </ol>
          ) : null}
        </div>
      ))}
    </>
  );
}
