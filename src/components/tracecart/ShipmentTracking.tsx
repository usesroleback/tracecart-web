"use client";

import { FormEvent, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { api } from "@/lib/apiClient";
import Button from "@/components/ui/button/Button";
import { Card } from "@/components/ui/card/Card";
import { DsUploadIcon } from "@/icons";
import { MILESTONES, Milestone, Order } from "@/lib/types";
import { useFormat } from "@/lib/format";
import { Field, RequiredNote } from "@/components/ui/form/Form";

const input =
  "h-10 w-full rounded-[var(--radius-s)] border border-line-strong bg-surface-raised px-3 text-sm text-ink placeholder:text-ink-muted focus:outline-2 focus:outline-offset-2 focus:outline-focus-ring";

// Mirrors the API (modules/tracking): events from payment until delivery; after it, only a return.
const TRACKABLE = new Set(["PAID", "PURCHASED", "RECEIVED_HUB", "CONFIRMED_HUB", "PICKED_UP", "IN_TRANSIT"]);
const PROOF_STATUSES = new Set(["PICKED_UP", "IN_TRANSIT", "DELIVERED"]);
const INTERNAL: Milestone[] = ["INSPECTION_COMPLETED", "CUSTOMS_CLEARANCE_STARTED"];
const NEEDS_REASON: Milestone[] = ["DELAY_REPORTED", "DELIVERY_ATTEMPT_FAILED"];
const TAKES_ETA: Milestone[] = ["DISPATCHED", "DELAY_REPORTED", "ETA_REVISED", "BORDER_PROCESSING", "DESTINATION_HUB_RECEIVED"];

/**
 * What has happened to the goods since payment (docs/design/notifications-and-exceptions.md):
 * the estimated arrival window, each recorded milestone, a form for the
 * carrier or staff to record the next one, and proof of delivery.
 */
export function ShipmentTracking({ order, onChanged }: { order: Order; onChanged: () => void }) {
  const t = useTranslations("orders");
  const tl = useTranslations("labels");
  const f = useFormat();
  const canRecord = TRACKABLE.has(order.status) || order.status === "DELIVERED";
  const window = (from: string | null, to: string | null) =>
    from && to && from.slice(0, 10) !== to.slice(0, 10) ? t("tracking.etaRange", { from: f.date(from), to: f.date(to) }) : f.date((from ?? to)!);
  const proofs = order.photos.filter((p) => p.kind === "PROOF_OF_DELIVERY");

  if (!canRecord && order.shipmentEvents.length === 0) return null;

  return (
    <Card padding={24}>
      <h2 className="rb-title">{t("tracking.title")}</h2>
      <div className="mt-3 rounded-[var(--radius-s)] bg-surface-sunken px-4 py-3 text-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.04em] text-ink-muted">{t("tracking.eta")}</p>
        <p className="mt-0.5 font-semibold text-ink">{order.etaFrom || order.etaTo ? window(order.etaFrom, order.etaTo) : t("tracking.noEta")}</p>
        {(order.originalEtaFrom || order.originalEtaTo) &&
          (order.originalEtaFrom !== order.etaFrom || order.originalEtaTo !== order.etaTo) && (
            <p className="text-[13px] text-ink-muted">{t("tracking.originalEta", { window: window(order.originalEtaFrom, order.originalEtaTo) })}</p>
          )}
      </div>

      {order.shipmentEvents.length === 0 ? (
        <p className="mt-3 text-sm text-ink-muted">{t("tracking.empty")}</p>
      ) : (
        <ol className="mt-3 grid">
          {order.shipmentEvents.map((e) => (
            <li key={e.id} className="border-b border-line py-2.5 last:border-b-0">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span className="font-semibold text-ink">
                  {tl(`milestone.${e.milestone}`)}
                  {e.city ? ` — ${e.city}` : ""}
                </span>
                <span className="rb-mono text-xs text-ink-muted">{t("tracking.by", { source: tl(`eventSource.${e.source}`), when: f.dayTime(e.occurredAt) })}</span>
              </div>
              {e.reason && <p className="text-[13px] text-ink">{e.reason}</p>}
              {e.customerNote && <p className="text-[13px] text-ink">« {e.customerNote} »</p>}
              {e.internalNote && <p className="text-[13px] italic text-ink-muted">{e.internalNote}</p>}
              {(e.etaFrom || e.etaTo) && <p className="text-[13px] text-ink-muted">{t("tracking.eta")} : {window(e.etaFrom, e.etaTo)}</p>}
            </li>
          ))}
        </ol>
      )}

      {canRecord && (
        <details className="mt-4 rounded-[var(--radius-s)] border border-line">
          <summary className="cursor-pointer px-3 py-2 text-sm font-semibold">{t("tracking.record")}</summary>
          <div className="border-t border-line p-3">
            <RecordEventForm path={`/orders/${order.id}/events`} delivered={order.status === "DELIVERED"} onChanged={onChanged} />
          </div>
        </details>
      )}

      {(PROOF_STATUSES.has(order.status) || proofs.length > 0) && (
        <div className="mt-4">
          <p className="rb-overline">{t("tracking.proof.title")}</p>
          {proofs.length === 0 ? (
            <p className="mt-1 text-sm text-ink-muted">{t("tracking.proof.none")}</p>
          ) : (
            <ul className="mt-2 flex flex-wrap gap-2">
              {proofs.map((p) => (
                <li key={p.id}>
                  <a href={`/api/tracecart${p.url}`} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-[var(--radius-s)] border border-line">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/api/tracecart${p.url}`} alt={p.originalName ?? t("tracking.proof.title")} className="h-16 w-16 object-cover" />
                  </a>
                </li>
              ))}
            </ul>
          )}
          {PROOF_STATUSES.has(order.status) && <ProofUploader orderId={order.id} onChanged={onChanged} />}
        </div>
      )}
    </Card>
  );
}

/**
 * Records a milestone at `path` — an order's events, or a groupage's (each of
 * its orders gets it). `delivered`: only a return can still be recorded.
 */
export function RecordEventForm({ path, delivered = false, onChanged }: { path: string; delivered?: boolean; onChanged: (result: unknown) => void }) {
  const t = useTranslations("orders");
  const tl = useTranslations("labels");
  const choices = delivered ? (["RETURN_STARTED"] as Milestone[]) : MILESTONES.filter((m) => m !== "RETURN_STARTED");
  const [milestone, setMilestone] = useState<Milestone>(choices[0]);
  const [v, setV] = useState({ occurredAt: "", city: "", reason: "", customerNote: "", internalNote: "", etaFrom: "", etaTo: "", externalRef: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  // One key per form fill: a double click or a retry after a network error records it once.
  const key = useRef(crypto.randomUUID());
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setV({ ...v, [k]: e.target.value });
  const day = (d: string) => (d ? new Date(`${d}T12:00:00Z`).toISOString() : undefined);
  const text = (s: string) => s.trim() || undefined;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const result = await api.post(path, {
        milestone,
        occurredAt: v.occurredAt ? new Date(v.occurredAt).toISOString() : undefined,
        city: text(v.city),
        reason: text(v.reason),
        customerNote: text(v.customerNote),
        internalNote: text(v.internalNote),
        etaFrom: day(v.etaFrom),
        etaTo: day(v.etaTo),
        externalRef: text(v.externalRef),
        idempotencyKey: key.current,
      });
      key.current = crypto.randomUUID();
      setV({ occurredAt: "", city: "", reason: "", customerNote: "", internalNote: "", etaFrom: "", etaTo: "", externalRef: "" });
      setSaved(true);
      onChanged(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("actionFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
      <RequiredNote className="col-span-full" />
      <Field label={t("tracking.milestone")} className="sm:col-span-2">
        <select className={input} value={milestone} onChange={(e) => setMilestone(e.target.value as Milestone)}>
          {choices.map((m) => (
            <option key={m} value={m}>
              {tl(`milestone.${m}`)}
            </option>
          ))}
        </select>
        <span className="mt-1 block text-xs text-ink-muted">{t(INTERNAL.includes(milestone) ? "tracking.internalOnly" : "tracking.customerSees")}</span>
      </Field>
      <Field label={t("tracking.occurredAt")}>
        <input type="datetime-local" className={input} value={v.occurredAt} onChange={set("occurredAt")} />
      </Field>
      <Field label={t("tracking.city")}>
        <input className={input} value={v.city} onChange={set("city")} />
      </Field>
      {NEEDS_REASON.includes(milestone) && (
        <Field label={t("tracking.reason")} className="sm:col-span-2">
          <input className={input} required value={v.reason} onChange={set("reason")} />
        </Field>
      )}
      {TAKES_ETA.includes(milestone) && (
        <>
          <Field label={t("tracking.etaFrom")}>
            <input type="date" className={input} required={milestone === "ETA_REVISED"} value={v.etaFrom} onChange={set("etaFrom")} />
          </Field>
          <Field label={t("tracking.etaTo")}>
            <input type="date" className={input} value={v.etaTo} onChange={set("etaTo")} />
          </Field>
        </>
      )}
      {!INTERNAL.includes(milestone) && (
        <Field label={t("tracking.customerNote")} className="sm:col-span-2">
          <input className={input} value={v.customerNote} onChange={set("customerNote")} />
        </Field>
      )}
      <Field label={t("tracking.internalNote")} className="sm:col-span-2">
        <input className={input} value={v.internalNote} onChange={set("internalNote")} />
      </Field>
      <Field label={t("tracking.externalRef")}>
        <input className={input} value={v.externalRef} onChange={set("externalRef")} />
      </Field>
      <div className="flex items-end gap-3">
        <Button type="submit" loading={busy}>
          {t("tracking.save")}
        </Button>
        {saved && <span className="text-sm text-positive">{t("tracking.saved")}</span>}
      </div>
      {error && <p className="text-xs text-critical sm:col-span-2">{error}</p>}
    </form>
  );
}

function ProofUploader({ orderId, onChanged }: { orderId: string; onChanged: () => void }) {
  const t = useTranslations("orders");
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      Array.from(files)
        .slice(0, 6)
        .forEach((file) => form.append("photos", file));
      await api.postForm(`/orders/${orderId}/proof-of-delivery`, form);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("actionFailed"));
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = "";
    }
  }
  return (
    <div className="mt-2">
      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-[var(--radius-m)] border border-dashed border-line-strong bg-surface-raised px-4 py-3 text-sm text-ink-muted hover:bg-surface-sunken">
        <DsUploadIcon />
        {busy ? t("tracking.proof.uploading") : t("tracking.proof.add")}
        <input ref={ref} type="file" accept="image/*" multiple className="hidden" disabled={busy} onChange={(e) => upload(e.target.files)} />
      </label>
      {error && <p className="mt-1 text-xs text-critical">{error}</p>}
    </div>
  );
}
