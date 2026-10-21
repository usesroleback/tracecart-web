"use client";

import { FormEvent, ReactNode, useState } from "react";
import { useTranslations } from "next-intl";
import { api } from "@/lib/apiClient";
import Button from "@/components/ui/button/Button";
import { Badge } from "@/components/ui/badge/Badge";
import { Card } from "@/components/ui/card/Card";
import { DsPlusIcon } from "@/icons";
import { useSession } from "@/context/SessionContext";
import { CarrierService, HANDLING_FLAGS, HandlingFlag, TRANSPORT_MODES, TransportMode } from "@/lib/types";
import { useFormat } from "@/lib/format";

const TH = "sticky top-0 whitespace-nowrap border-b border-line bg-surface-sunken px-3 py-2 text-left text-[12px] font-[650] uppercase tracking-[0.04em] text-ink-muted";
const TD = "border-b border-line px-3 py-2 align-top";
const input =
  "h-10 w-full rounded-[var(--radius-s)] border border-line-strong bg-surface-raised px-3 text-sm text-ink placeholder:text-ink-muted focus:outline-2 focus:outline-offset-2 focus:outline-focus-ring disabled:opacity-60";

type Carrier = { id: string; name: string; email: string; phone: string | null };

/**
 * Carrier services (docs/design/pricing-routing-and-customs.md §5): what each
 * carrier offers on each corridor, within which limits and how fast. Orders
 * are routed only to a service that fits them.
 */
export function CarriersDashboard({ initialServices, carriers }: { initialServices: CarrierService[]; carriers: Carrier[] }) {
  const t = useTranslations("orders");
  const tl = useTranslations("labels");
  const f = useFormat();
  const [services, setServices] = useState(initialServices);
  const [editing, setEditing] = useState<CarrierService | "new" | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setServices(await api.get<CarrierService[]>("/carrier-services"));
  }

  async function toggle(s: CarrierService) {
    setBusyId(s.id);
    try {
      await api.patch(`/carrier-services/${s.id}`, { active: !s.active });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  const limits = (s: CarrierService) => {
    const parts = [s.maxWeightKg && `≤ ${f.number(Number(s.maxWeightKg))} kg`, s.maxLengthCm && `≤ ${f.number(Number(s.maxLengthCm))} cm`].filter(Boolean);
    return (
      <>
        {parts.length ? parts.join(" · ") : t("carriersPage.noLimit")}
        {s.refusedFlags.length > 0 && (
          <span className="block text-xs text-ink-muted">{t("carriersPage.refuses", { flags: s.refusedFlags.map((fl) => tl(`handlingFlag.${fl}`)).join(", ") })}</span>
        )}
      </>
    );
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <h1 className="rb-headline text-[32px]">{t("carriersPage.title")}</h1>
          <p className="mt-1 text-sm text-ink-muted">{t("carriersPage.subtitle")}</p>
        </div>
        <Button startIcon={<DsPlusIcon width={18} height={18} />} onClick={() => setEditing("new")}>
          {t("carriersPage.new")}
        </Button>
      </div>

      {editing && (
        <Card padding={24} className="mt-6">
          <ServiceForm
            service={editing === "new" ? null : editing}
            carriers={carriers}
            onCancel={() => setEditing(null)}
            onSaved={async () => {
              setEditing(null);
              await load();
            }}
          />
        </Card>
      )}

      {services.length === 0 ? (
        <p className="mt-6 text-sm text-ink-muted">{t("carriersPage.empty")}</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-[var(--radius-m)] border border-line bg-surface-raised">
          <table className="w-full min-w-[760px] border-separate border-spacing-0 text-sm">
            <caption className="sr-only">{t("carriersPage.caption")}</caption>
            <thead>
              <tr>
                <th className={TH}>{t("carriersPage.col.service")}</th>
                <th className={TH}>{t("carriersPage.col.corridor")}</th>
                <th className={TH}>{t("carriersPage.col.limits")}</th>
                <th className={TH}>{t("carriersPage.col.transit")}</th>
                <th className={`${TH} text-right`}>{t("carriersPage.col.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {services.map((s) => (
                <tr key={s.id} className={s.active ? "" : "text-ink-muted"}>
                  <td className={TD}>
                    <span className="font-semibold">{s.name}</span> {!s.active && <Badge variant="outline">{t("carriersPage.inactive")}</Badge>}
                    <span className="block text-xs text-ink-muted">
                      {s.partner.name} · {tl(`transportMode.${s.mode}`)}
                    </span>
                  </td>
                  <td className={TD}>
                    {s.originHub?.city ?? t("carriersPage.anyHub")} → {s.destinationCountry}
                  </td>
                  <td className={TD}>{limits(s)}</td>
                  <td className={TD}>
                    {t("carriersPage.days", { min: s.transitDaysMin, max: s.transitDaysMax })}
                    {s.handlingDays > 0 && <span className="block text-xs text-ink-muted">{t("carriersPage.handling", { days: s.handlingDays })}</span>}
                  </td>
                  <td className={`${TD} text-right`}>
                    <div className="flex justify-end gap-2">
                      <Button variant="secondary" size="s" onClick={() => setEditing(s)}>
                        {t("carriersPage.edit")}
                      </Button>
                      <Button variant="ghost" size="s" loading={busyId === s.id} onClick={() => toggle(s)}>
                        {s.active ? t("carriersPage.disable") : t("carriersPage.enable")}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Field({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block text-sm ${className}`}>
      <span className="rb-label mb-1 block text-ink">{label}</span>
      {children}
    </label>
  );
}

const str = (v: string | number | null | undefined) => (v == null ? "" : String(v));
const numOrNull = (v: string) => (v.trim() === "" ? null : Number(v));

function ServiceForm({ service, carriers, onCancel, onSaved }: { service: CarrierService | null; carriers: Carrier[]; onCancel: () => void; onSaved: () => void }) {
  const t = useTranslations("orders");
  const tl = useTranslations("labels");
  const user = useSession();
  const [v, setV] = useState({
    name: service?.name ?? "",
    partnerUserId: service?.partnerUserId ?? carriers[0]?.id ?? "",
    originHubId: service ? (service.originHubId ?? "") : (user.hubId ?? ""),
    destinationCountry: service?.destinationCountry ?? "",
    mode: service?.mode ?? ("ROAD" as TransportMode),
    maxWeightKg: str(service?.maxWeightKg),
    maxLengthCm: str(service?.maxLengthCm),
    transitDaysMin: str(service?.transitDaysMin),
    transitDaysMax: str(service?.transitDaysMax),
    handlingDays: str(service?.handlingDays ?? 0),
    priority: str(service?.priority ?? 0),
    notes: service?.notes ?? "",
  });
  const [refused, setRefused] = useState<HandlingFlag[]>(service?.refusedFlags ?? []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setV({ ...v, [k]: e.target.value });

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const common = {
      name: v.name.trim(),
      maxWeightKg: numOrNull(v.maxWeightKg),
      maxLengthCm: numOrNull(v.maxLengthCm),
      refusedFlags: refused,
      transitDaysMin: Number(v.transitDaysMin),
      transitDaysMax: Number(v.transitDaysMax),
      handlingDays: Number(v.handlingDays) || 0,
      priority: Number(v.priority) || 0,
      notes: v.notes.trim() || null,
    };
    try {
      if (service) await api.patch(`/carrier-services/${service.id}`, common);
      else
        await api.post("/carrier-services", {
          ...common,
          partnerUserId: v.partnerUserId,
          originHubId: v.originHubId || null,
          destinationCountry: v.destinationCountry.trim(),
          mode: v.mode,
        });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("actionFailed"));
    } finally {
      setBusy(false);
    }
  }

  const num = { type: "number", min: "0", step: "any", className: input } as const;
  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Field label={t("carriersPage.field.name")} className="sm:col-span-2">
        <input className={input} required value={v.name} onChange={set("name")} />
      </Field>
      <Field label={t("carriersPage.field.carrier")}>
        <select className={input} required value={v.partnerUserId} onChange={set("partnerUserId")} disabled={!!service}>
          {carriers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} · {c.email}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t("carriersPage.field.mode")}>
        <select className={input} value={v.mode} onChange={set("mode")} disabled={!!service}>
          {TRANSPORT_MODES.map((m) => (
            <option key={m} value={m}>
              {tl(`transportMode.${m}`)}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t("carriersPage.field.originHub")}>
        <select className={input} value={v.originHubId} onChange={set("originHubId")} disabled={!!service}>
          {user.hub && <option value={user.hub.id}>{t("carriersPage.myHub", { city: user.hub.city })}</option>}
          <option value="">{t("carriersPage.anyHub")}</option>
        </select>
      </Field>
      <Field label={t("carriersPage.field.destinationCountry")}>
        <input className={input} required value={v.destinationCountry} onChange={set("destinationCountry")} disabled={!!service} />
      </Field>
      <Field label={t("carriersPage.field.transitMin")}>
        <input {...num} step="1" required value={v.transitDaysMin} onChange={set("transitDaysMin")} />
      </Field>
      <Field label={t("carriersPage.field.transitMax")}>
        <input {...num} step="1" required value={v.transitDaysMax} onChange={set("transitDaysMax")} />
      </Field>
      <Field label={t("carriersPage.field.handlingDays")}>
        <input {...num} step="1" value={v.handlingDays} onChange={set("handlingDays")} />
      </Field>
      <Field label={t("carriersPage.field.maxWeightKg")}>
        <input {...num} value={v.maxWeightKg} onChange={set("maxWeightKg")} />
      </Field>
      <Field label={t("carriersPage.field.maxLengthCm")}>
        <input {...num} value={v.maxLengthCm} onChange={set("maxLengthCm")} />
      </Field>
      <Field label={t("carriersPage.field.priority")}>
        <input type="number" step="1" className={input} value={v.priority} onChange={set("priority")} />
      </Field>
      <fieldset className="sm:col-span-2 lg:col-span-4">
        <legend className="rb-label mb-1 text-sm text-ink">{t("carriersPage.field.refused")}</legend>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {HANDLING_FLAGS.map((fl) => (
            <label key={fl} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={refused.includes(fl)} onChange={(e) => setRefused(e.target.checked ? [...refused, fl] : refused.filter((x) => x !== fl))} />
              {tl(`handlingFlag.${fl}`)}
            </label>
          ))}
        </div>
      </fieldset>
      <Field label={t("carriersPage.field.notes")} className="sm:col-span-2 lg:col-span-4">
        <input className={input} value={v.notes} onChange={set("notes")} />
      </Field>
      <div className="flex flex-wrap items-center gap-2 sm:col-span-2 lg:col-span-4">
        <Button type="submit" loading={busy}>
          {t("carriersPage.save")}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          {t("carriersPage.cancel")}
        </Button>
        {error && <p className="text-sm text-critical">{error}</p>}
      </div>
    </form>
  );
}
