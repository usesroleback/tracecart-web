"use client";

import { FormEvent, useState } from "react";
import { useTranslations } from "next-intl";
import { api } from "@/lib/apiClient";
import Button from "@/components/ui/button/Button";
import { Badge } from "@/components/ui/badge/Badge";
import { Card } from "@/components/ui/card/Card";
import { DsPlusIcon } from "@/icons";
import { CarrierService, HANDLING_FLAGS, HandlingFlag, Hub, RateVersion, TRANSPORT_MODES, TransportMode } from "@/lib/types";
import { useFormat } from "@/lib/format";
import { CountryInput, CurrencyInput, Field, FormActions, FormSection, input, RangeInputs, UnitInput } from "@/components/ui/form/Form";

const TH = "sticky top-0 whitespace-nowrap border-b border-line bg-surface-sunken px-3 py-2 text-left text-[12px] font-[650] uppercase tracking-[0.04em] text-ink-muted";
const TD = "border-b border-line px-3 py-2 align-top";

export type Carrier = { id: string; name: string; email: string; phone: string | null; locale: "fr" | "en"; signedIn: boolean };

/**
 * Carrier services (docs/design/pricing-routing-and-customs.md §5): what each
 * carrier offers on each corridor, within which limits, how fast, and at which
 * rates (docs/design/catalogue-pricing-and-revenue.md §2). Orders are routed
 * only to a service that fits them, and priced from its rate card when it has
 * one. An administrateur manages every carrier's services ("admin"); a carrier
 * manages its own ("carrier") and can't set their priority.
 */
export function CarrierServices({ view, initialServices, carriers = [], hubs }: { view: "admin" | "carrier"; initialServices: CarrierService[]; carriers?: Carrier[]; hubs: Hub[] }) {
  const t = useTranslations("orders");
  const tl = useTranslations("labels");
  const f = useFormat();
  const [services, setServices] = useState(initialServices);
  const [editing, setEditing] = useState<CarrierService | "new" | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const own = view === "carrier";

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

  const rates = (s: CarrierService) => {
    const bands = s.weightBands ?? [];
    if (!s.rateCurrency || bands.length === 0) return <span className="text-ink-muted">{t("carriersPage.rates.none")}</span>;
    const first = bands[0];
    return (
      <>
        {first.flat != null
          ? t("carriersPage.rates.fromFlat", { amount: f.money(first.flat, s.rateCurrency), kg: f.number(first.upToKg ?? 0) })
          : t("carriersPage.rates.fromPerKg", { amount: f.money(first.perKg ?? 0, s.rateCurrency) })}
        <span className="block text-xs text-ink-muted">
          {[
            t("carriersPage.rates.bands", { count: bands.length }),
            s.minCharge && t("carriersPage.rates.min", { amount: f.money(s.minCharge, s.rateCurrency) }),
            (s.surcharges?.length ?? 0) > 0 && t("carriersPage.rates.surcharges", { count: s.surcharges!.length }),
            s.ratesUpdatedAt && t("carriersPage.rates.version", { version: s.rateVersion, date: f.date(s.ratesUpdatedAt) }),
          ]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </>
    );
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <h1 className="rb-headline text-[32px]">{t(own ? "carriersPage.ownTitle" : "carriersPage.title")}</h1>
          <p className="mt-1 text-sm text-ink-muted">{t(own ? "carriersPage.ownSubtitle" : "carriersPage.subtitle")}</p>
        </div>
        <Button startIcon={<DsPlusIcon width={18} height={18} />} onClick={() => setEditing("new")}>
          {t(own ? "carriersPage.ownNew" : "carriersPage.new")}
        </Button>
      </div>

      {editing && (
        <Card padding={24} className="mt-6">
          <ServiceForm
            view={view}
            service={editing === "new" ? null : editing}
            carriers={carriers}
            hubs={hubs}
            onCancel={() => setEditing(null)}
            onSaved={async () => {
              setEditing(null);
              await load();
            }}
          />
        </Card>
      )}

      {services.length === 0 ? (
        <p className="mt-6 text-sm text-ink-muted">{t(own ? "carriersPage.ownEmpty" : "carriersPage.empty")}</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-[var(--radius-m)] border border-line bg-surface-raised">
          <table className="w-full min-w-[900px] border-separate border-spacing-0 text-sm">
            <caption className="sr-only">{t("carriersPage.caption")}</caption>
            <thead>
              <tr>
                <th className={TH}>{t("carriersPage.col.service")}</th>
                <th className={TH}>{t("carriersPage.col.corridor")}</th>
                <th className={TH}>{t("carriersPage.col.limits")}</th>
                <th className={TH}>{t("carriersPage.col.transit")}</th>
                <th className={TH}>{t("carriersPage.col.rates")}</th>
                <th className={`${TH} text-right`}>{t("carriersPage.col.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {services.map((s) => (
                <tr key={s.id} className={s.active ? "" : "text-ink-muted"}>
                  <td className={TD}>
                    <span className="font-semibold">{s.name}</span> {!s.active && <Badge variant="outline">{t("carriersPage.inactive")}</Badge>}
                    <span className="block text-xs text-ink-muted">
                      {own ? tl(`transportMode.${s.mode}`) : `${s.partner.name} · ${tl(`transportMode.${s.mode}`)}`}
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
                  <td className={TD}>{rates(s)}</td>
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

const str = (v: string | number | null | undefined) => (v == null ? "" : String(v));
const numOrNull = (v: string) => (v.trim() === "" ? null : Number(v));

type BandRow = { upToKg: string; kind: "perKg" | "flat"; amount: string };
type SurchargeRow = { kind: "none" | "percent" | "fixed"; amount: string };

function ServiceForm({
  view,
  service,
  carriers,
  hubs,
  onCancel,
  onSaved,
}: {
  view: "admin" | "carrier";
  service: CarrierService | null;
  carriers: Carrier[];
  hubs: Hub[];
  onCancel: () => void;
  onSaved: () => void;
}) {
  const t = useTranslations("orders");
  const tl = useTranslations("labels");
  const admin = view === "admin";
  const [v, setV] = useState({
    name: service?.name ?? "",
    partnerUserId: service?.partnerUserId ?? carriers[0]?.id ?? "",
    originHubId: service?.originHubId ?? "",
    destinationCountry: service?.destinationCountry ?? "",
    mode: service?.mode ?? ("ROAD" as TransportMode),
    maxWeightKg: str(service?.maxWeightKg),
    maxLengthCm: str(service?.maxLengthCm),
    transitDaysMin: str(service?.transitDaysMin),
    transitDaysMax: str(service?.transitDaysMax),
    handlingDays: str(service?.handlingDays ?? 0),
    priority: str(service?.priority ?? 0),
    notes: service?.notes ?? "",
    rateCurrency: service?.rateCurrency ?? "",
    baseFee: str(service?.baseFee),
    minCharge: str(service?.minCharge),
    volumetricDivisor: str(service?.volumetricDivisor),
  });
  const [refused, setRefused] = useState<HandlingFlag[]>(service?.refusedFlags ?? []);
  const [bands, setBands] = useState<BandRow[]>(
    service?.weightBands?.length
      ? service.weightBands.map((b) => ({ upToKg: str(b.upToKg), kind: b.flat != null ? "flat" : "perKg", amount: str(b.flat ?? b.perKg) }))
      : [{ upToKg: "", kind: "perKg", amount: "" }],
  );
  const [surcharges, setSurcharges] = useState<Record<HandlingFlag, SurchargeRow>>(
    () =>
      Object.fromEntries(
        HANDLING_FLAGS.map((fl) => {
          const s = service?.surcharges?.find((x) => x.flag === fl);
          return [fl, s ? { kind: s.percent != null ? "percent" : "fixed", amount: str(s.percent ?? s.fixed) } : { kind: "none", amount: "" }];
        }),
      ) as Record<HandlingFlag, SurchargeRow>,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof v) => (e: { target: { value: string } }) => setV({ ...v, [k]: e.target.value });
  const setBand = (i: number, patch: Partial<BandRow>) => setBands(bands.map((b, j) => (j === i ? { ...b, ...patch } : b)));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const filledBands = bands.filter((b) => b.amount.trim() !== "");
    const common = {
      name: v.name.trim(),
      maxWeightKg: numOrNull(v.maxWeightKg),
      maxLengthCm: numOrNull(v.maxLengthCm),
      refusedFlags: refused,
      transitDaysMin: Number(v.transitDaysMin),
      transitDaysMax: Number(v.transitDaysMax),
      handlingDays: Number(v.handlingDays) || 0,
      ...(admin ? { priority: Number(v.priority) || 0 } : {}),
      notes: v.notes.trim() || null,
      rateCurrency: v.rateCurrency.trim() || null,
      baseFee: numOrNull(v.baseFee),
      minCharge: numOrNull(v.minCharge),
      volumetricDivisor: numOrNull(v.volumetricDivisor),
      weightBands: filledBands.map((b) => ({ upToKg: numOrNull(b.upToKg), [b.kind]: Number(b.amount) })),
      surcharges: HANDLING_FLAGS.filter((fl) => !refused.includes(fl) && surcharges[fl].kind !== "none" && surcharges[fl].amount.trim() !== "").map((fl) => ({
        flag: fl,
        [surcharges[fl].kind]: Number(surcharges[fl].amount),
      })),
    };
    try {
      if (service) await api.patch(`/carrier-services/${service.id}`, common);
      else
        await api.post("/carrier-services", {
          ...common,
          ...(admin ? { partnerUserId: v.partnerUserId } : {}),
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

  const cur = v.rateCurrency.trim().toUpperCase() || "—";
  const days = t("carriersPage.form.days");
  const BAND_GRID = "grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_6rem] items-center gap-2";
  return (
    <form onSubmit={submit} className="grid gap-6">
      <FormSection title={t("carriersPage.form.route")}>
        <Field label={t("carriersPage.field.name")} className="sm:col-span-2">
          <input className={input} required value={v.name} onChange={set("name")} />
        </Field>
        {admin && (
          <Field label={t("carriersPage.field.carrier")}>
            <select className={input} required value={v.partnerUserId} onChange={set("partnerUserId")} disabled={!!service}>
              {carriers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} · {c.email}
                </option>
              ))}
            </select>
          </Field>
        )}
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
            <option value="">{t("carriersPage.anyHub")}</option>
            {hubs.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name} · {h.city}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("carriersPage.field.destinationCountry")}>
          <CountryInput required value={v.destinationCountry} onChange={set("destinationCountry")} disabled={!!service} />
        </Field>
        <Field label={t("carriersPage.form.transit")}>
          <RangeInputs
            unit={days}
            labels={{ min: t("carriersPage.field.transitMin"), max: t("carriersPage.field.transitMax") }}
            min={{ value: v.transitDaysMin, onChange: set("transitDaysMin"), step: "1", required: true }}
            max={{ value: v.transitDaysMax, onChange: set("transitDaysMax"), step: "1", required: true }}
          />
        </Field>
        <Field label={t("carriersPage.field.handlingDays")}>
          <UnitInput unit={days} step="1" value={v.handlingDays} onChange={set("handlingDays")} />
        </Field>
        {admin && (
          <Field label={t("carriersPage.field.priority")} hint={t("carriersPage.form.priorityHint")}>
            <input type="number" step="1" className={input} value={v.priority} onChange={set("priority")} />
          </Field>
        )}
      </FormSection>

      <FormSection title={t("carriersPage.form.limits")}>
        <Field label={t("carriersPage.field.maxWeightKg")} hint={t("carriersPage.form.noLimitHint")}>
          <UnitInput unit="kg" value={v.maxWeightKg} onChange={set("maxWeightKg")} />
        </Field>
        <Field label={t("carriersPage.field.maxLengthCm")} hint={t("carriersPage.form.noLimitHint")}>
          <UnitInput unit="cm" value={v.maxLengthCm} onChange={set("maxLengthCm")} />
        </Field>
        <fieldset className="min-w-0 sm:col-span-2 lg:col-span-3">
          <legend className="rb-label mb-2 text-sm text-ink">{t("carriersPage.field.refused")}</legend>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {HANDLING_FLAGS.map((fl) => (
              <label key={fl} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={refused.includes(fl)} onChange={(e) => setRefused(e.target.checked ? [...refused, fl] : refused.filter((x) => x !== fl))} />
                {tl(`handlingFlag.${fl}`)}
              </label>
            ))}
          </div>
        </fieldset>
      </FormSection>

      <FormSection title={t("carriersPage.rates.title")} columns={4}>
        <p className="text-sm text-ink-muted sm:col-span-2 lg:col-span-4">{t("carriersPage.rates.intro")}</p>
        <Field label={t("carriersPage.rates.currency")}>
          <CurrencyInput value={v.rateCurrency} onChange={set("rateCurrency")} />
        </Field>
        <Field label={t("carriersPage.rates.baseFee")}>
          <UnitInput unit={cur} value={v.baseFee} onChange={set("baseFee")} />
        </Field>
        <Field label={t("carriersPage.rates.minCharge")}>
          <UnitInput unit={cur} value={v.minCharge} onChange={set("minCharge")} />
        </Field>
        <Field label={t("carriersPage.rates.divisor")} hint={t("carriersPage.rates.divisorHint")}>
          <input type="number" min="0" step="1" className={input} placeholder={v.mode === "AIR" ? "5000" : "6000"} value={v.volumetricDivisor} onChange={set("volumetricDivisor")} />
        </Field>

        <div className="min-w-0 sm:col-span-2 lg:col-span-4">
          <p className="rb-label mb-2 text-sm text-ink">{t("carriersPage.rates.bandsTitle")}</p>
          <div className="max-w-3xl">
            <div className={`${BAND_GRID} mb-1 text-xs text-ink-muted`}>
              <span>{t("carriersPage.rates.upToKg")}</span>
              <span>{t("carriersPage.rates.kind")}</span>
              <span>{t("carriersPage.rates.amount")}</span>
            </div>
            <div className="flex flex-col gap-2">
              {bands.map((b, i) => (
                <div key={i} className={BAND_GRID}>
                  <UnitInput unit="kg" aria-label={t("carriersPage.rates.upToKg")} placeholder={t("carriersPage.rates.noUpperLimit")} value={b.upToKg} onChange={(e) => setBand(i, { upToKg: e.target.value })} />
                  <select className={input} aria-label={t("carriersPage.rates.kind")} value={b.kind} onChange={(e) => setBand(i, { kind: e.target.value as BandRow["kind"] })}>
                    <option value="perKg">{t("carriersPage.rates.perKg")}</option>
                    <option value="flat">{t("carriersPage.rates.flat")}</option>
                  </select>
                  <UnitInput unit={b.kind === "perKg" ? `${cur}/kg` : cur} aria-label={t("carriersPage.rates.amount")} value={b.amount} onChange={(e) => setBand(i, { amount: e.target.value })} />
                  <Button variant="ghost" size="s" onClick={() => setBands(bands.filter((_, j) => j !== i))} disabled={bands.length === 1}>
                    {t("carriersPage.rates.removeBand")}
                  </Button>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-ink-muted">{t("carriersPage.rates.bandsHint")}</p>
            <Button variant="secondary" size="s" className="mt-2" onClick={() => setBands([...bands, { upToKg: "", kind: "perKg", amount: "" }])}>
              {t("carriersPage.rates.addBand")}
            </Button>
          </div>
        </div>

        <div className="min-w-0 sm:col-span-2 lg:col-span-4">
          <p className="rb-label mb-2 text-sm text-ink">{t("carriersPage.rates.surchargesTitle")}</p>
          <div className="grid gap-x-6 gap-y-2 md:grid-cols-2">
            {HANDLING_FLAGS.filter((fl) => !refused.includes(fl)).map((fl) => (
              <div key={fl} className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)] items-center gap-2">
                <span className="text-sm">{tl(`handlingFlag.${fl}`)}</span>
                <select
                  className={input}
                  aria-label={t("carriersPage.rates.kind")}
                  value={surcharges[fl].kind}
                  onChange={(e) => setSurcharges({ ...surcharges, [fl]: { ...surcharges[fl], kind: e.target.value as SurchargeRow["kind"] } })}
                >
                  <option value="none">{t("carriersPage.rates.noSurcharge")}</option>
                  <option value="percent">%</option>
                  <option value="fixed">{t("carriersPage.rates.fixed")}</option>
                </select>
                <UnitInput
                  unit={surcharges[fl].kind === "percent" ? "%" : cur}
                  aria-label={t("carriersPage.rates.amount")}
                  disabled={surcharges[fl].kind === "none"}
                  value={surcharges[fl].amount}
                  onChange={(e) => setSurcharges({ ...surcharges, [fl]: { ...surcharges[fl], amount: e.target.value } })}
                />
              </div>
            ))}
          </div>
        </div>
      </FormSection>

      {service && service.rateVersion > 0 && <RateHistory serviceId={service.id} />}

      <Field label={t("carriersPage.field.notes")}>
        <input className={input} value={v.notes} onChange={set("notes")} />
      </Field>
      <FormActions error={error}>
        <Button type="submit" loading={busy}>
          {t("carriersPage.save")}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          {t("carriersPage.cancel")}
        </Button>
      </FormActions>
    </form>
  );
}

/** Every version of a service's rates, latest first: what each rate-card quote was priced with. */
function RateHistory({ serviceId }: { serviceId: string }) {
  const t = useTranslations("orders.carriersPage.rates");
  const f = useFormat();
  const [versions, setVersions] = useState<RateVersion[] | null>(null);
  const [open, setOpen] = useState(false);

  async function toggle() {
    if (!open && !versions) setVersions(await api.get<RateVersion[]>(`/carrier-services/${serviceId}/rate-history`));
    setOpen(!open);
  }

  return (
    <div className="sm:col-span-2 lg:col-span-4">
      <Button variant="ghost" size="s" onClick={toggle}>
        {open ? t("hideHistory") : t("showHistory")}
      </Button>
      {open && versions && (
        <ol className="mt-2 grid gap-1 text-sm">
          {versions.map((v) => {
            const c = v.rateCard;
            const first = c.weightBands?.[0];
            return (
              <li key={v.version} className="border-b border-line py-1">
                <span className="font-semibold">{t("versionShort", { version: v.version })}</span>{" "}
                <span className="text-ink-muted">
                  · {f.dateTime(v.createdAt)} · {v.createdByUser.name}
                </span>
                <span className="block text-xs text-ink-muted">
                  {[
                    c.rateCurrency,
                    first && (first.flat != null ? t("fromFlat", { amount: f.money(first.flat), kg: f.number(first.upToKg ?? 0) }) : t("fromPerKg", { amount: f.money(first.perKg ?? 0) })),
                    t("bands", { count: c.weightBands?.length ?? 0 }),
                    c.baseFee ? `${t("baseFee")} ${f.money(c.baseFee)}` : null,
                    c.minCharge ? t("min", { amount: f.money(c.minCharge) }) : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
