"use client";

import { FormEvent, ReactNode, useState } from "react";
import { useTranslations } from "next-intl";
import { api } from "@/lib/apiClient";
import Button from "@/components/ui/button/Button";
import { Badge } from "@/components/ui/badge/Badge";
import { Card } from "@/components/ui/card/Card";
import {
  ADDRESS_KINDS,
  AddressKind,
  CUSTOMS_RESPONSIBILITIES,
  CUSTOMS_STATUSES,
  CustomsCase,
  HANDLING_FLAGS,
  HandlingFlag,
  Order,
  OrderAddress,
} from "@/lib/types";
import { useFormat } from "@/lib/format";

const input =
  "h-10 w-full rounded-[var(--radius-s)] border border-line-strong bg-surface-raised px-3 text-sm text-ink placeholder:text-ink-muted focus:outline-2 focus:outline-offset-2 focus:outline-focus-ring disabled:opacity-60";

// What changes the price is fixed once the quote is out (the API enforces it too).
const PRICE_EDITABLE = new Set(["INTENT_SUBMITTED", "QUOTING", "QUOTED"]);

function Field({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block text-sm ${className}`}>
      <span className="rb-label mb-1 block text-ink">{label}</span>
      {children}
    </label>
  );
}

/** Runs a save, reports failure inline, and refreshes the order on success. */
function useSave(onChanged: () => void) {
  const t = useTranslations("orders");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function save(fn: () => Promise<unknown>, done?: () => void) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      done?.();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("actionFailed"));
    } finally {
      setBusy(false);
    }
  }
  return { busy, error, save };
}

const blank = (v: string) => (v.trim() === "" ? undefined : v.trim());
const numOrNull = (v: string) => (v.trim() === "" ? null : Number(v));

/**
 * The order's shipment file (docs/design/concepts-and-domain-model.md): where
 * the goods are collected and delivered, the cargo as it travels, compliance
 * and customs. Administrateurs edit it; the carrier reads what they need.
 */
export function ShipmentFile({ order, isAdmin, onChanged }: { order: Order; isAdmin: boolean; onChanged: () => void }) {
  const t = useTranslations("orders");
  const editable = isAdmin && PRICE_EDITABLE.has(order.status);
  return (
    <Card padding={24}>
      <h2 className="rb-title">{t("shipment.title")}</h2>
      {isAdmin && !editable && <p className="mt-1 text-[13px] text-ink-muted">{t("shipment.frozen")}</p>}
      <div className="mt-4 grid gap-6 xl:grid-cols-2">
        <Addresses order={order} editable={editable} isAdmin={isAdmin} onChanged={onChanged} />
        <div className="grid content-start gap-6">
          <Cargo order={order} editable={editable} onChanged={onChanged} />
          <Compliance order={order} isAdmin={isAdmin} onChanged={onChanged} />
          <Customs order={order} isAdmin={isAdmin} priceEditable={editable} onChanged={onChanged} />
        </div>
      </div>
    </Card>
  );
}

function Addresses({ order, editable, isAdmin, onChanged }: { order: Order; editable: boolean; isAdmin: boolean; onChanged: () => void }) {
  const t = useTranslations("orders");
  const tl = useTranslations("labels");
  const [editing, setEditing] = useState<AddressKind | null>(null);
  const { busy, error, save } = useSave(onChanged);
  const kinds = isAdmin ? ADDRESS_KINDS : ADDRESS_KINDS.filter((k) => order.addresses.some((a) => a.kind === k));

  return (
    <section>
      <p className="rb-overline">{t("shipment.addresses")}</p>
      <ul className="mt-2 grid">
        {kinds.map((kind) => {
          const a = order.addresses.find((x) => x.kind === kind);
          return (
            <li key={kind} className="border-b border-line py-3 last:border-b-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.04em] text-ink-muted">{tl(`addressKind.${kind}`)}</p>
                  {a ? <AddressText a={a} /> : <p className="mt-0.5 text-sm text-ink-muted">{t("shipment.noAddress")}</p>}
                </div>
                {editable && editing !== kind && (
                  <div className="flex flex-none gap-1">
                    <Button variant="ghost" size="s" onClick={() => setEditing(kind)}>
                      {t(a ? "shipment.edit" : "shipment.add")}
                    </Button>
                    {a && kind !== "DELIVERY" && (
                      <Button variant="ghost" size="s" loading={busy} onClick={() => save(() => api.delete(`/orders/${order.id}/addresses/${kind}`))}>
                        {t("shipment.remove")}
                      </Button>
                    )}
                  </div>
                )}
              </div>
              {editing === kind && (
                <AddressForm
                  initial={a}
                  hint={kind === "DELIVERY" ? t("shipment.address.deliveryHint") : undefined}
                  busy={busy}
                  onCancel={() => setEditing(null)}
                  onSave={(body) => save(() => api.put(`/orders/${order.id}/addresses/${kind}`, body), () => setEditing(null))}
                />
              )}
            </li>
          );
        })}
      </ul>
      {error && <p className="mt-2 text-xs text-critical">{error}</p>}
    </section>
  );
}

function AddressText({ a }: { a: OrderAddress }) {
  return (
    <div className="mt-0.5 text-sm text-ink">
      <p>{[a.line1, a.line2].filter(Boolean).join(", ")}</p>
      <p>{[a.postalCode, a.city, a.region, a.country].filter(Boolean).join(", ")}</p>
      {(a.contactName || a.phone) && <p className="text-ink-muted">{[a.contactName, a.phone].filter(Boolean).join(" · ")}</p>}
      {a.notes && <p className="text-[13px] italic text-ink-muted">{a.notes}</p>}
    </div>
  );
}

const ADDRESS_FIELDS = ["contactName", "phone", "line1", "line2", "postalCode", "city", "region", "country", "notes"] as const;

function AddressForm({
  initial,
  hint,
  busy,
  onCancel,
  onSave,
}: {
  initial?: OrderAddress;
  hint?: string;
  busy: boolean;
  onCancel: () => void;
  onSave: (body: Record<string, string | undefined>) => void;
}) {
  const t = useTranslations("orders");
  const [v, setV] = useState<Record<string, string>>(() => Object.fromEntries(ADDRESS_FIELDS.map((f) => [f, initial?.[f] ?? ""])));
  function submit(e: FormEvent) {
    e.preventDefault();
    onSave(Object.fromEntries(ADDRESS_FIELDS.map((f) => [f, blank(v[f])])));
  }
  return (
    <form onSubmit={submit} className="mt-3 grid gap-3 sm:grid-cols-2">
      {ADDRESS_FIELDS.map((f) => (
        <Field key={f} label={t(`shipment.address.${f}`)} className={f === "line1" || f === "notes" ? "sm:col-span-2" : ""}>
          <input
            className={input}
            value={v[f]}
            required={f === "line1" || f === "city" || f === "country"}
            onChange={(e) => setV({ ...v, [f]: e.target.value })}
            autoComplete="off"
          />
        </Field>
      ))}
      {hint && <p className="text-[13px] text-ink-muted sm:col-span-2">{hint}</p>}
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" size="s" loading={busy}>
          {t("shipment.save")}
        </Button>
        <Button variant="ghost" size="s" onClick={onCancel}>
          {t("shipment.cancel")}
        </Button>
      </div>
    </form>
  );
}

function Cargo({ order, editable, onChanged }: { order: Order; editable: boolean; onChanged: () => void }) {
  const t = useTranslations("orders");
  const tl = useTranslations("labels");
  const f = useFormat();
  const [editing, setEditing] = useState(false);
  const { busy, error, save } = useSave(onChanged);
  const unknown = t("shipment.cargo.unknown");
  const dims = [order.lengthCm, order.widthCm, order.heightCm];
  const facts: [string, ReactNode][] = [
    [t("shipment.cargo.category"), order.productCategory ?? unknown],
    [t("shipment.cargo.packages"), order.packageCount != null ? f.number(order.packageCount) : unknown],
    [t("shipment.cargo.dimensions"), dims.every((d) => d != null) ? dims.map((d) => f.number(Number(d))).join(" × ") : unknown],
    [t("shipment.cargo.weight"), order.grossWeightKg != null ? f.number(Number(order.grossWeightKg)) : unknown],
    ...(order.declaredValue !== undefined
      ? [[t("shipment.cargo.declaredValue"), order.declaredValue != null ? f.money(order.declaredValue, order.declaredValueCurrency) : unknown] as [string, ReactNode]]
      : []),
    [
      t("shipment.cargo.flags"),
      order.handlingFlags.length ? (
        <span className="flex flex-wrap gap-1">
          {order.handlingFlags.map((fl) => (
            <Badge key={fl} variant={fl === "MEDICAL_DEVICE" || fl === "DANGEROUS_GOODS" ? "attn" : "outline"}>
              {tl(`handlingFlag.${fl}`)}
            </Badge>
          ))}
        </span>
      ) : (
        t("shipment.cargo.none")
      ),
    ],
    [t("shipment.cargo.readyAt"), order.readyAt ? f.date(order.readyAt) : unknown],
    [
      t("shipment.cargo.requiredBy"),
      order.requiredBy ? `${f.date(order.requiredBy)}${order.requiredByIsHard ? ` · ${t("shipment.cargo.hardDeadline")}` : ""}` : unknown,
    ],
  ];

  return (
    <section>
      <div className="flex items-center justify-between gap-2">
        <p className="rb-overline">{t("shipment.cargo.title")}</p>
        {editable && !editing && (
          <Button variant="ghost" size="s" onClick={() => setEditing(true)}>
            {t("shipment.edit")}
          </Button>
        )}
      </div>
      {editing ? (
        <CargoForm order={order} busy={busy} onCancel={() => setEditing(false)} onSave={(body) => save(() => api.patch(`/orders/${order.id}/cargo`, body), () => setEditing(false))} />
      ) : (
        <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2">
          {facts.map(([k, v]) => (
            <div key={k}>
              <dt className="text-xs font-semibold uppercase tracking-[0.04em] text-ink-muted">{k}</dt>
              <dd className="mt-0.5 text-sm font-[560] text-ink">{v}</dd>
            </div>
          ))}
        </dl>
      )}
      {error && <p className="mt-2 text-xs text-critical">{error}</p>}
    </section>
  );
}

const day = (iso: string | null) => (iso ? iso.slice(0, 10) : "");

function CargoForm({ order, busy, onCancel, onSave }: { order: Order; busy: boolean; onCancel: () => void; onSave: (body: unknown) => void }) {
  const t = useTranslations("orders");
  const tl = useTranslations("labels");
  const [v, setV] = useState({
    productCategory: order.productCategory ?? "",
    packageCount: order.packageCount?.toString() ?? "",
    lengthCm: order.lengthCm ?? "",
    widthCm: order.widthCm ?? "",
    heightCm: order.heightCm ?? "",
    grossWeightKg: order.grossWeightKg ?? "",
    declaredValue: order.declaredValue ?? "",
    declaredValueCurrency: order.declaredValueCurrency ?? order.hub.currency,
    readyAt: day(order.readyAt),
    requiredBy: day(order.requiredBy),
  });
  const [flags, setFlags] = useState<HandlingFlag[]>(order.handlingFlags);
  const [hard, setHard] = useState(order.requiredByIsHard);
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: e.target.value });
  const toDate = (d: string) => (d ? new Date(`${d}T12:00:00Z`).toISOString() : null);

  function submit(e: FormEvent) {
    e.preventDefault();
    onSave({
      productCategory: blank(v.productCategory) ?? null,
      packageCount: numOrNull(v.packageCount),
      lengthCm: numOrNull(v.lengthCm),
      widthCm: numOrNull(v.widthCm),
      heightCm: numOrNull(v.heightCm),
      grossWeightKg: numOrNull(v.grossWeightKg),
      declaredValue: numOrNull(v.declaredValue),
      declaredValueCurrency: v.declaredValue.trim() ? v.declaredValueCurrency.trim().toUpperCase() : null,
      handlingFlags: flags,
      readyAt: toDate(v.readyAt),
      requiredBy: toDate(v.requiredBy),
      requiredByIsHard: hard && !!v.requiredBy,
    });
  }

  const num = { type: "number", min: "0", step: "any", className: input } as const;
  return (
    <form onSubmit={submit} className="mt-2 grid gap-3 sm:grid-cols-2">
      <Field label={t("shipment.cargo.category")}>
        <input className={input} value={v.productCategory} onChange={set("productCategory")} />
      </Field>
      <Field label={t("shipment.cargo.packages")}>
        <input {...num} step="1" min="1" value={v.packageCount} onChange={set("packageCount")} />
      </Field>
      <fieldset className="sm:col-span-2">
        <legend className="rb-label mb-1 text-sm text-ink">{t("shipment.cargo.dimensions")}</legend>
        <div className="grid grid-cols-3 gap-2">
          <input {...num} aria-label={t("shipment.cargo.length")} placeholder={t("shipment.cargo.length")} value={v.lengthCm} onChange={set("lengthCm")} />
          <input {...num} aria-label={t("shipment.cargo.width")} placeholder={t("shipment.cargo.width")} value={v.widthCm} onChange={set("widthCm")} />
          <input {...num} aria-label={t("shipment.cargo.height")} placeholder={t("shipment.cargo.height")} value={v.heightCm} onChange={set("heightCm")} />
        </div>
      </fieldset>
      <Field label={t("shipment.cargo.weight")}>
        <input {...num} value={v.grossWeightKg} onChange={set("grossWeightKg")} />
      </Field>
      <Field label={t("shipment.cargo.declaredValue")}>
        <div className="flex gap-2">
          <input {...num} className={`${input} min-w-0 flex-1`} value={v.declaredValue} onChange={set("declaredValue")} />
          <input className={`${input} w-20 flex-none`} maxLength={3} aria-label={t("shipment.customs.currency")} value={v.declaredValueCurrency} onChange={set("declaredValueCurrency")} />
        </div>
      </Field>
      <fieldset className="sm:col-span-2">
        <legend className="rb-label mb-1 text-sm text-ink">{t("shipment.cargo.flags")}</legend>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {HANDLING_FLAGS.map((fl) => (
            <label key={fl} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={flags.includes(fl)} onChange={(e) => setFlags(e.target.checked ? [...flags, fl] : flags.filter((x) => x !== fl))} />
              {tl(`handlingFlag.${fl}`)}
            </label>
          ))}
        </div>
      </fieldset>
      <Field label={t("shipment.cargo.readyAt")}>
        <input type="date" className={input} value={v.readyAt} onChange={set("readyAt")} />
      </Field>
      <Field label={t("shipment.cargo.requiredBy")}>
        <input type="date" className={input} value={v.requiredBy} onChange={set("requiredBy")} />
      </Field>
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input type="checkbox" checked={hard} disabled={!v.requiredBy} onChange={(e) => setHard(e.target.checked)} />
        {t("shipment.cargo.hardDeadline")}
      </label>
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" size="s" loading={busy}>
          {t("shipment.save")}
        </Button>
        <Button variant="ghost" size="s" onClick={onCancel}>
          {t("shipment.cancel")}
        </Button>
      </div>
    </form>
  );
}

function Compliance({ order, isAdmin, onChanged }: { order: Order; isAdmin: boolean; onChanged: () => void }) {
  const t = useTranslations("orders");
  const tl = useTranslations("labels");
  const [note, setNote] = useState("");
  const { busy, error, save } = useSave(onChanged);
  if (order.complianceStatus === "NOT_REQUIRED") return null;
  const variant = order.complianceStatus === "APPROVED" ? "positive" : order.complianceStatus === "BLOCKED" ? "critical" : "attn";

  return (
    <section>
      <p className="rb-overline">{t("shipment.compliance.title")}</p>
      <div className="mt-2">
        <Badge variant={variant}>{tl(`compliance.${order.complianceStatus}`)}</Badge>
      </div>
      {order.complianceStatus === "REVIEW_REQUIRED" && <p className="mt-2 text-sm text-ink-muted">{t("shipment.compliance.reviewBody")}</p>}
      {order.complianceNote && <p className="mt-2 text-sm text-ink">{order.complianceNote}</p>}
      {isAdmin && order.complianceStatus === "REVIEW_REQUIRED" && (
        <div className="mt-3 grid gap-2">
          <Field label={t("shipment.compliance.note")}>
            <textarea className={`${input} h-auto min-h-[72px] py-2`} value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          <div className="flex gap-2">
            <Button size="s" disabled={!note.trim()} loading={busy} onClick={() => save(() => api.put(`/orders/${order.id}/compliance`, { status: "APPROVED", note: note.trim() }))}>
              {t("shipment.compliance.approve")}
            </Button>
            <Button size="s" variant="danger" disabled={!note.trim()} loading={busy} onClick={() => save(() => api.put(`/orders/${order.id}/compliance`, { status: "BLOCKED", note: note.trim() }))}>
              {t("shipment.compliance.block")}
            </Button>
          </div>
        </div>
      )}
      {error && <p className="mt-2 text-xs text-critical">{error}</p>}
    </section>
  );
}

function Customs({ order, isAdmin, priceEditable, onChanged }: { order: Order; isAdmin: boolean; priceEditable: boolean; onChanged: () => void }) {
  const t = useTranslations("orders");
  const tl = useTranslations("labels");
  const f = useFormat();
  const [editing, setEditing] = useState(false);
  const { busy, error, save } = useSave(onChanged);
  const c = order.customsCase ?? null;
  const carrierView = order.customs ?? null;
  const amount = (v: string | null) => (v != null ? f.money(v, c?.currency) : null);

  const facts: [string, ReactNode][] = c
    ? [
        [t("shipment.customs.responsibility"), tl(`customsResponsibility.${c.responsibility}`)],
        [t("shipment.customs.status"), tl(`customsStatus.${c.status}`)],
        [t("shipment.customs.estimatedDuties"), amount(c.estimatedDuties)],
        [t("shipment.customs.officialAssessment"), amount(c.officialAssessment)],
        [t("shipment.customs.brokerFee"), amount(c.brokerFee)],
        [t("shipment.customs.hsCode"), c.hsCodeProposal && `${c.hsCodeProposal} · ${t(c.classificationReviewed ? "shipment.customs.reviewed" : "shipment.customs.notReviewed")}`],
        [t("shipment.customs.origin"), c.originCountry],
        [t("shipment.customs.documents"), c.documentsNote],
        [t("shipment.customs.notes"), c.notes],
      ]
    : carrierView
      ? [
          [t("shipment.customs.responsibility"), tl(`customsResponsibility.${carrierView.responsibility}`)],
          [t("shipment.customs.status"), tl(`customsStatus.${carrierView.status}`)],
          [t("shipment.customs.documents"), carrierView.documentsNote],
        ]
      : [];

  return (
    <section>
      <div className="flex items-center justify-between gap-2">
        <p className="rb-overline">{t("shipment.customs.title")}</p>
        {isAdmin && !editing && (
          <Button variant="ghost" size="s" onClick={() => setEditing(true)}>
            {t(c ? "shipment.edit" : "shipment.customs.open")}
          </Button>
        )}
      </div>
      {editing ? (
        <CustomsForm
          initial={c}
          currency={order.currency ?? order.hub.currency}
          priceEditable={priceEditable}
          busy={busy}
          onCancel={() => setEditing(false)}
          onSave={(body) => save(() => api.put(`/orders/${order.id}/customs`, body), () => setEditing(false))}
        />
      ) : facts.length ? (
        <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2">
          {facts
            .filter(([, v]) => v != null && v !== "")
            .map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs font-semibold uppercase tracking-[0.04em] text-ink-muted">{k}</dt>
                <dd className="mt-0.5 text-sm font-[560] text-ink">{v}</dd>
              </div>
            ))}
        </dl>
      ) : (
        <p className="mt-2 text-sm text-ink-muted">{t("shipment.customs.none")}</p>
      )}
      {error && <p className="mt-2 text-xs text-critical">{error}</p>}
    </section>
  );
}

function CustomsForm({
  initial,
  currency,
  priceEditable,
  busy,
  onCancel,
  onSave,
}: {
  initial: CustomsCase | null;
  currency: string;
  priceEditable: boolean;
  busy: boolean;
  onCancel: () => void;
  onSave: (body: unknown) => void;
}) {
  const t = useTranslations("orders");
  const tl = useTranslations("labels");
  const [v, setV] = useState({
    responsibility: initial?.responsibility ?? "UNKNOWN",
    status: initial?.status ?? "NOT_STARTED",
    currency: initial?.currency ?? currency,
    estimatedDuties: initial?.estimatedDuties ?? "",
    officialAssessment: initial?.officialAssessment ?? "",
    brokerFee: initial?.brokerFee ?? "",
    hsCodeProposal: initial?.hsCodeProposal ?? "",
    originCountry: initial?.originCountry ?? "",
    documentsNote: initial?.documentsNote ?? "",
    notes: initial?.notes ?? "",
  });
  const [reviewed, setReviewed] = useState(initial?.classificationReviewed ?? false);
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setV({ ...v, [k]: e.target.value });

  function submit(e: FormEvent) {
    e.preventDefault();
    onSave({
      // What the quote was priced on stays as sent; the official figure can always be recorded.
      ...(priceEditable
        ? { responsibility: v.responsibility, currency: blank(v.currency)?.toUpperCase() ?? null, estimatedDuties: numOrNull(v.estimatedDuties), brokerFee: numOrNull(v.brokerFee) }
        : {}),
      status: v.status,
      officialAssessment: numOrNull(v.officialAssessment),
      hsCodeProposal: blank(v.hsCodeProposal) ?? null,
      classificationReviewed: reviewed,
      originCountry: blank(v.originCountry) ?? null,
      documentsNote: blank(v.documentsNote) ?? null,
      notes: blank(v.notes) ?? null,
    });
  }

  const num = { type: "number", min: "0", step: "any", className: input } as const;
  return (
    <form onSubmit={submit} className="mt-2 grid gap-3 sm:grid-cols-2">
      <Field label={t("shipment.customs.responsibility")}>
        <select className={input} value={v.responsibility} onChange={set("responsibility")} disabled={!priceEditable}>
          {CUSTOMS_RESPONSIBILITIES.map((r) => (
            <option key={r} value={r}>
              {tl(`customsResponsibility.${r}`)}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t("shipment.customs.status")}>
        <select className={input} value={v.status} onChange={set("status")}>
          {CUSTOMS_STATUSES.map((s) => (
            <option key={s} value={s}>
              {tl(`customsStatus.${s}`)}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t("shipment.customs.estimatedDuties")}>
        <input {...num} value={v.estimatedDuties} onChange={set("estimatedDuties")} disabled={!priceEditable} />
      </Field>
      <Field label={t("shipment.customs.brokerFee")}>
        <input {...num} value={v.brokerFee} onChange={set("brokerFee")} disabled={!priceEditable} />
      </Field>
      <Field label={t("shipment.customs.officialAssessment")}>
        <input {...num} value={v.officialAssessment} onChange={set("officialAssessment")} />
      </Field>
      <Field label={t("shipment.customs.currency")}>
        <input className={input} maxLength={3} value={v.currency} onChange={set("currency")} disabled={!priceEditable} />
      </Field>
      <Field label={t("shipment.customs.hsCode")}>
        <input className={input} value={v.hsCodeProposal} onChange={set("hsCodeProposal")} />
      </Field>
      <Field label={t("shipment.customs.origin")}>
        <input className={input} value={v.originCountry} onChange={set("originCountry")} />
      </Field>
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input type="checkbox" checked={reviewed} onChange={(e) => setReviewed(e.target.checked)} />
        {t("shipment.customs.reviewed")}
      </label>
      <Field label={t("shipment.customs.documents")} className="sm:col-span-2">
        <textarea className={`${input} h-auto min-h-[64px] py-2`} value={v.documentsNote} onChange={set("documentsNote")} />
      </Field>
      <Field label={t("shipment.customs.notes")} className="sm:col-span-2">
        <textarea className={`${input} h-auto min-h-[64px] py-2`} value={v.notes} onChange={set("notes")} />
      </Field>
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" size="s" loading={busy}>
          {t("shipment.save")}
        </Button>
        <Button variant="ghost" size="s" onClick={onCancel}>
          {t("shipment.cancel")}
        </Button>
      </div>
    </form>
  );
}
