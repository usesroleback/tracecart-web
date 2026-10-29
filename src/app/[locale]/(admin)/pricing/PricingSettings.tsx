"use client";

import { FormEvent, ReactNode, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { api } from "@/lib/apiClient";
import Button from "@/components/ui/button/Button";
import { Badge } from "@/components/ui/badge/Badge";
import { Card } from "@/components/ui/card/Card";
import { CountryInput, CurrencyInput, Field, FormActions, FormSection, input, UnitInput, RequiredMark, RequiredNote } from "@/components/ui/form/Form";
import { SetupChecklist } from "@/components/tracecart/SetupGuide";
import { refreshReadiness, useReadiness } from "@/lib/readiness";
import { PricingSettings as Settings } from "@/lib/types";
import { useFormat } from "@/lib/format";

const str = (v: string | number | null | undefined) => (v == null ? "" : String(v));
const numOrNull = (v: string) => (v.trim() === "" ? null : Number(v));

type Need = "required" | "recommended" | "optional";

/** One step of the setup: its number, whether the shop needs it, what it's for. */
function Section({ id, step, need, title, intro, children }: { id: string; step: number; need: Need; title: string; intro: string; children: ReactNode }) {
  const t = useTranslations("pricing.setup");
  return (
    <Card padding={24} className="mt-6 scroll-mt-24">
      <div id={id} className="flex flex-wrap items-center gap-2">
        <span className="rb-overline text-ink-muted">{t("step", { step })}</span>
        <Badge variant={need === "required" ? "outline" : "default"}>{t(`need.${need}`)}</Badge>
      </div>
      <h2 className="rb-headline mt-1 text-xl">{title}</h2>
      <p className="mt-1 max-w-3xl text-sm text-ink-muted">{intro}</p>
      <div className="mt-5">{children}</div>
    </Card>
  );
}

/** What's already set, one line each, with its actions on the right. */
function SavedList({ children }: { children: ReactNode }) {
  return <ul className="mb-5 grid divide-y divide-line rounded-[var(--radius-m)] border border-line text-sm">{children}</ul>;
}

function SavedRow({ muted = false, children, actions }: { muted?: boolean; children: ReactNode; actions: ReactNode }) {
  return (
    <li className={`flex flex-wrap items-center justify-between gap-2 px-3 py-2 ${muted ? "text-ink-muted" : ""}`}>
      <span className="min-w-0">{children}</span>
      <span className="flex gap-2">{actions}</span>
    </li>
  );
}

/**
 * What prices are built from beyond carrier rates
 * (docs/design/catalogue-pricing-and-revenue.md): the hub's margins, exchange
 * rates, customs rates, and the weight assumed for a product of a category.
 */
export function PricingSettings({ initial }: { initial: Settings }) {
  const t = useTranslations("pricing.settings");
  const [settings, setSettings] = useState(initial);
  const readiness = useReadiness(true);
  const reload = async () => {
    setSettings(await api.get<Settings>("/pricing-settings"));
    refreshReadiness();
  };

  // In the order to set them: steps 1 and 2 (hub, routes) are on their own pages.
  return (
    <div>
      <h1 className="rb-headline text-[32px]">{t("title")}</h1>
      <p className="mt-1 max-w-3xl text-sm text-ink-muted">{t("subtitle")}</p>
      <SetupChecklist readiness={readiness} />
      <ExchangeRates settings={settings} missing={readiness?.exchangeRates.missing ?? []} onSaved={reload} />
      <Margins settings={settings} onSaved={reload} />
      <OtherHubsInbound settings={settings} waiting={readiness?.inbound.missingHubs ?? []} onSaved={reload} />
      <CustomsRates settings={settings} onSaved={reload} />
      <CategoryDefaults settings={settings} onSaved={reload} />
    </div>
  );
}

function useSubmit(onSaved: () => Promise<void>) {
  const t = useTranslations("pricing.settings");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await fn();
      await onSaved();
      setSaved(true);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : t("failed"));
      return false;
    } finally {
      setBusy(false);
    }
  }
  /** Shows a client-side problem the way a server one is shown. */
  const fail = (message: string) => {
    setSaved(false);
    setError(message);
  };
  return { busy, error, saved, run, fail };
}

const TIER_GRID = "grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_5.5rem] items-center gap-2";

/** A product and a transport price to show the margins on, sized to the currency. */
const exampleFor = (currency: string) =>
  ["XOF", "XAF", "NGN", "GNF", "CDF", "UGX", "TZS", "RWF", "BIF", "MGA"].includes(currency) ? { product: "100000", transport: "25000", weight: "3" } : { product: "200", transport: "50", weight: "3" };

function Margins({ settings, onSaved }: { settings: Settings; onSaved: () => Promise<void> }) {
  const t = useTranslations("pricing.settings.margins");
  const f = useFormat();
  const m = settings.margins;
  const [tiers, setTiers] = useState((m.productFeeTiers ?? []).map((x) => ({ upTo: str(x.upTo), percent: str(x.percent) })));
  const [v, setV] = useState({
    productFeeMin: str(m.productFeeMin),
    transportMarkupPercent: str(m.transportMarkupPercent),
    priceBufferPercent: str(m.priceBufferPercent),
    inboundFee: str(m.inboundFee),
    inboundPerKg: str(m.inboundPerKg),
  });
  const [ex, setEx] = useState(() => exampleFor(m.currency));
  const { busy, error, saved, run, fail } = useSubmit(onSaved);
  const setTier = (i: number, k: "upTo" | "percent", value: string) => setTiers(tiers.map((x, j) => (j === i ? { ...x, [k]: value } : x)));
  const used = useMemo(() => tiers.filter((x) => x.upTo.trim() !== "" || x.percent.trim() !== ""), [tiers]);

  // What the server would refuse, said before sending.
  function problem(): string | null {
    if (used.some((x) => x.percent.trim() === "")) return t("errors.percentMissing");
    if (used.filter((x) => x.upTo.trim() === "").length > 1) return t("errors.oneOpen");
    const limits = used.map((x) => x.upTo.trim()).filter(Boolean).map(Number);
    if (new Set(limits).size !== limits.length) return t("errors.sameLimit");
    return null;
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    const p = problem();
    if (p) return fail(p);
    run(() =>
      api.put("/pricing-settings/margins", {
        productFeeTiers: used.map((x) => ({ upTo: numOrNull(x.upTo), percent: Number(x.percent) })),
        // 0 or empty: no minimum.
        productFeeMin: numOrNull(v.productFeeMin) || null,
        transportMarkupPercent: Number(v.transportMarkupPercent) || 0,
        priceBufferPercent: Number(v.priceBufferPercent) || 0,
        inboundFee: numOrNull(v.inboundFee),
        inboundPerKg: numOrNull(v.inboundPerKg),
      }),
    );
  }

  // The margins on the example order, worked out as the API does (modules/pricing/margin.ts).
  const example = useMemo(() => {
    const product = Number(ex.product) || 0;
    const transport = Number(ex.transport) || 0;
    // The origin leg, as modules/pricing/margin.ts inboundCost.
    const inbound = Math.round((Number(v.inboundFee) || 0) + (Number(v.inboundPerKg) || 0) * (Number(ex.weight) || 0));
    const sorted = used
      .filter((x) => x.percent.trim() !== "")
      .map((x) => ({ upTo: numOrNull(x.upTo), percent: Number(x.percent) }))
      .sort((a, b) => (a.upTo ?? Infinity) - (b.upTo ?? Infinity));
    const percent = sorted.find((x) => x.upTo == null || product <= x.upTo)?.percent ?? m.defaultFeePercent;
    const fee = Math.max(Math.round((product * percent) / 100), Math.round(Number(v.productFeeMin) || 0));
    const markup = Math.round((transport * (Number(v.transportMarkupPercent) || 0)) / 100);
    const buffer = Math.round((product * (Number(v.priceBufferPercent) || 0)) / 100);
    return { product, inbound, transport, percent, fee, markup, buffer, total: product + inbound + transport + fee + markup + buffer };
  }, [ex, used, v, m.defaultFeePercent]);
  const money = (n: number) => f.money(n, m.currency);
  const lines: [string, number, string?][] = [
    ["product", example.product],
    ["inbound", example.inbound],
    ["transport", example.transport],
    ["fee", example.fee, f.percent(example.percent)],
    ["markup", example.markup],
    ["buffer", example.buffer],
  ];

  return (
    <Section id="margins" step={4} need="recommended" title={t("title", { hub: m.name })} intro={t("intro", { currency: m.currency })}>
      <form onSubmit={submit} className="grid gap-6">
        <RequiredNote />
        <FormSection title={t("onProduct")} columns={2}>
          <div className="min-w-0 sm:col-span-2">
            <p className="rb-label mb-1 text-sm text-ink">{t("tiers")}</p>
            <p className="mb-2 text-xs text-ink-muted">{t("tiersHint", { currency: m.currency })}</p>
            {tiers.length === 0 ? (
              <p className="mb-2 rounded-[var(--radius-m)] bg-surface-sunken px-3 py-2 text-sm">{t("noTiers", { percent: m.defaultFeePercent })}</p>
            ) : (
              <div className="mb-2 max-w-xl">
                <div className={`${TIER_GRID} mb-1 text-xs text-ink-muted`}>
                  <span>{t("upTo", { currency: m.currency })}</span>
                  <span>
                    {t("percent")}
                    <RequiredMark />
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  {tiers.map((tier, i) => (
                    <div key={i} className={TIER_GRID}>
                      <UnitInput unit={m.currency} min="1" aria-label={t("upTo", { currency: m.currency })} placeholder={t("noLimit")} value={tier.upTo} onChange={(e) => setTier(i, "upTo", e.target.value)} />
                      <UnitInput unit="%" max="100" required aria-label={t("percent")} placeholder={String(m.defaultFeePercent)} value={tier.percent} onChange={(e) => setTier(i, "percent", e.target.value)} />
                      <Button variant="ghost" size="s" onClick={() => setTiers(tiers.filter((_, j) => j !== i))}>
                        {t("remove")}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <Button variant="secondary" size="s" onClick={() => setTiers([...tiers, { upTo: "", percent: "" }])}>
              {t("addTier")}
            </Button>
          </div>
          <Field label={t("min", { currency: m.currency })} hint={t("minHint")}>
            <UnitInput unit={m.currency} value={v.productFeeMin} onChange={(e) => setV({ ...v, productFeeMin: e.target.value })} />
          </Field>
          <Field label={t("buffer")} hint={t("bufferHint")}>
            <UnitInput unit="%" max="50" value={v.priceBufferPercent} onChange={(e) => setV({ ...v, priceBufferPercent: e.target.value })} />
          </Field>
        </FormSection>
        <FormSection title={t("inbound.title")} columns={2}>
          <p className="-mt-1 text-xs text-ink-muted sm:col-span-2">{t("inbound.hint", { currency: m.currency })}</p>
          <Field label={t("inbound.fee", { currency: m.currency })}>
            <UnitInput unit={m.currency} required value={v.inboundFee} onChange={(e) => setV({ ...v, inboundFee: e.target.value })} />
          </Field>
          <Field label={t("inbound.perKg", { currency: m.currency })}>
            <UnitInput unit={`${m.currency}/kg`} required value={v.inboundPerKg} onChange={(e) => setV({ ...v, inboundPerKg: e.target.value })} />
          </Field>
        </FormSection>
        <FormSection title={t("onTransport")} columns={2}>
          <Field label={t("markup")} hint={t("markupHint")}>
            <UnitInput unit="%" max="100" value={v.transportMarkupPercent} onChange={(e) => setV({ ...v, transportMarkupPercent: e.target.value })} />
          </Field>
        </FormSection>

        {/* Not saved: an order to see what the figures above do to a price. */}
        <div className="rounded-[var(--radius-m)] border border-line p-4">
          <p className="rb-overline text-ink-muted">{t("example.title")}</p>
          <div className="mt-2 grid max-w-2xl gap-3 sm:grid-cols-3">
            <Field label={t("example.product")}>
              <UnitInput unit={m.currency} value={ex.product} onChange={(e) => setEx({ ...ex, product: e.target.value })} />
            </Field>
            <Field label={t("example.weight")}>
              <UnitInput unit="kg" value={ex.weight} onChange={(e) => setEx({ ...ex, weight: e.target.value })} />
            </Field>
            <Field label={t("example.transport")}>
              <UnitInput unit={m.currency} value={ex.transport} onChange={(e) => setEx({ ...ex, transport: e.target.value })} />
            </Field>
          </div>
          <dl className="mt-3 grid max-w-xl gap-1 text-sm tabular-nums">
            {lines.map(([k, n, note]) => (
              <div key={k} className="flex justify-between gap-4">
                <dt className="text-ink-muted">
                  {t(`example.lines.${k}`)}
                  {note && ` (${note})`}
                </dt>
                <dd>{money(n)}</dd>
              </div>
            ))}
            <div className="mt-1 flex justify-between gap-4 border-t border-line pt-1 font-semibold">
              <dt>{t("example.total")}</dt>
              <dd>{money(example.total)}</dd>
            </div>
          </dl>
          <p className="mt-2 text-xs text-ink-muted">{t("example.note", { earned: money(example.fee + example.markup), buffer: money(example.buffer) })}</p>
        </div>

        <FormActions error={error} saved={saved}>
          <Button type="submit" loading={busy}>
            {t("save")}
          </Button>
        </FormActions>
      </form>
    </Section>
  );
}

function ExchangeRates({ settings, missing, onSaved }: { settings: Settings; missing: { from: string; to: string }[]; onSaved: () => Promise<void> }) {
  const t = useTranslations("pricing.settings.fx");
  const f = useFormat();
  const [v, setV] = useState({ currency: "", toCurrency: settings.margins.currency, rate: "", source: "" });
  const { busy, error, saved, run } = useSubmit(onSaved);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (await run(() => api.put("/pricing-settings/exchange-rates", { ...v, rate: Number(v.rate), source: v.source.trim() || null }))) {
      setV({ ...v, currency: "", rate: "", source: "" });
    }
  }

  return (
    <Section id="exchange-rates" step={3} need="required" title={t("title")} intro={t("intro")}>
      {settings.exchangeRates.length > 0 && (
        <SavedList>
          {settings.exchangeRates.map((r) => (
            <SavedRow
              key={r.id}
              actions={
                <Button variant="ghost" size="s" onClick={() => run(() => api.delete(`/pricing-settings/exchange-rates/${r.id}`))}>
                  {t("remove")}
                </Button>
              }
            >
              <span className="font-semibold tabular-nums">
                1 {r.currency} = {f.number(Number(r.rate), 6)} {r.toCurrency}
              </span>
              <span className="text-ink-muted">
                {" "}
                · {f.date(r.updatedAt)}
                {r.source && ` · ${r.source}`}
              </span>
            </SavedRow>
          ))}
        </SavedList>
      )}
      {missing.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-[var(--radius-m)] bg-attn-soft p-3 text-sm">
          <span>{t("missing")}</span>
          {missing.map((p) => (
            <Button key={`${p.from}>${p.to}`} variant="secondary" size="s" onClick={() => setV({ ...v, currency: p.from, toCurrency: p.to })}>
              {p.from} → {p.to}
            </Button>
          ))}
        </div>
      )}
      {/* Reads as a sentence: 1 EUR = 655.957 XOF. */}
      <form onSubmit={submit} className="grid gap-4">
        <RequiredNote className="col-span-full" />
        <div className="grid items-end gap-3 sm:grid-cols-[minmax(0,7rem)_1rem_minmax(0,11rem)_minmax(0,7rem)_minmax(0,1fr)]">
          <Field label={t("from")}>
            <CurrencyInput required placeholder="EUR" value={v.currency} onChange={(e) => setV({ ...v, currency: e.target.value })} />
          </Field>
          <span aria-hidden className="hidden pb-2.5 text-center font-semibold text-ink-muted sm:block">
            =
          </span>
          <Field label={t("rate")}>
            <input type="number" min="0" step="any" required placeholder="655.957" className={`${input} tabular-nums`} value={v.rate} onChange={(e) => setV({ ...v, rate: e.target.value })} />
          </Field>
          <Field label={t("to")}>
            <CurrencyInput required value={v.toCurrency} onChange={(e) => setV({ ...v, toCurrency: e.target.value })} />
          </Field>
          <Field label={t("source")}>
            <input className={input} value={v.source} onChange={(e) => setV({ ...v, source: e.target.value })} />
          </Field>
        </div>
        <FormActions error={error} saved={saved}>
          <Button type="submit" loading={busy}>
            {t("save")}
          </Button>
        </FormActions>
      </form>
    </Section>
  );
}

const emptyCustoms = { destinationCountry: "", productCategory: "", dutyPercent: "", taxPercent: "", brokerFee: "", currency: "" };

function CustomsRates({ settings, onSaved }: { settings: Settings; onSaved: () => Promise<void> }) {
  const t = useTranslations("pricing.settings.customs");
  const f = useFormat();
  const [editing, setEditing] = useState<string | null>(null);
  const [v, setV] = useState({ ...emptyCustoms, currency: settings.margins.currency });
  const { busy, error, saved, run } = useSubmit(onSaved);
  const set = (k: keyof typeof v) => (e: { target: { value: string } }) => setV({ ...v, [k]: e.target.value });
  const reset = () => {
    setEditing(null);
    setV({ ...emptyCustoms, currency: settings.margins.currency });
  };

  async function submit(e: FormEvent) {
    e.preventDefault();
    const body = {
      destinationCountry: v.destinationCountry,
      productCategory: v.productCategory.trim() || null,
      dutyPercent: Number(v.dutyPercent),
      taxPercent: Number(v.taxPercent) || 0,
      brokerFee: numOrNull(v.brokerFee),
      currency: v.currency,
    };
    if (await run(() => (editing ? api.patch(`/pricing-settings/customs-rates/${editing}`, body) : api.post("/pricing-settings/customs-rates", body)))) reset();
  }

  return (
    <Section id="customs-rates" step={5} need="recommended" title={t("title")} intro={t("intro")}>
      {settings.customsRates.length > 0 && (
        <SavedList>
          {settings.customsRates.map((r) => (
            <SavedRow
              key={r.id}
              muted={!r.active}
              actions={
                <>
                  <Button
                    variant="secondary"
                    size="s"
                    onClick={() => {
                      setEditing(r.id);
                      setV({
                        destinationCountry: r.destinationCountry,
                        productCategory: r.productCategory ?? "",
                        dutyPercent: str(r.dutyPercent),
                        taxPercent: str(r.taxPercent),
                        brokerFee: str(r.brokerFee),
                        currency: r.currency,
                      });
                    }}
                  >
                    {t("edit")}
                  </Button>
                  <Button variant="ghost" size="s" onClick={() => run(() => api.patch(`/pricing-settings/customs-rates/${r.id}`, { active: !r.active }))}>
                    {r.active ? t("disable") : t("enable")}
                  </Button>
                </>
              }
            >
              <span className="font-semibold">{r.destinationCountry}</span> · {r.productCategory ?? t("anyCategory")} ·{" "}
              <span className="tabular-nums">{t("summary", { duty: f.percent(Number(r.dutyPercent)), tax: f.percent(Number(r.taxPercent)) })}</span>
              {r.brokerFee && <span className="text-ink-muted"> · {t("broker", { amount: f.money(r.brokerFee, r.currency) })}</span>}{" "}
              {!r.active && <Badge variant="outline">{t("off")}</Badge>}
            </SavedRow>
          ))}
        </SavedList>
      )}
      <form onSubmit={submit} className="grid gap-4">
        <RequiredNote className="col-span-full" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label={t("country")}>
            <CountryInput required value={v.destinationCountry} onChange={set("destinationCountry")} />
          </Field>
          <Field label={t("category")}>
            <input className={input} placeholder={t("anyCategory")} value={v.productCategory} onChange={set("productCategory")} />
          </Field>
          <Field label={t("currency")}>
            <CurrencyInput required value={v.currency} onChange={set("currency")} />
          </Field>
          <Field label={t("duty")}>
            <UnitInput unit="%" required value={v.dutyPercent} onChange={set("dutyPercent")} />
          </Field>
          <Field label={t("tax")}>
            <UnitInput unit="%" value={v.taxPercent} onChange={set("taxPercent")} />
          </Field>
          <Field label={t("brokerFee")}>
            <UnitInput unit={v.currency || "—"} value={v.brokerFee} onChange={set("brokerFee")} />
          </Field>
        </div>
        <FormActions error={error} saved={saved}>
          <Button type="submit" loading={busy}>
            {editing ? t("update") : t("add")}
          </Button>
          {editing && (
            <Button variant="ghost" onClick={reset}>
              {t("cancel")}
            </Button>
          )}
        </FormActions>
      </form>
    </Section>
  );
}

const emptyCategory = { category: "", weightKg: "", lengthCm: "", widthCm: "", heightCm: "" };

function CategoryDefaults({ settings, onSaved }: { settings: Settings; onSaved: () => Promise<void> }) {
  const t = useTranslations("pricing.settings.categories");
  const f = useFormat();
  const [v, setV] = useState(emptyCategory);
  const { busy, error, saved, run } = useSubmit(onSaved);
  const set = (k: keyof typeof v) => (e: { target: { value: string } }) => setV({ ...v, [k]: e.target.value });

  async function submit(e: FormEvent) {
    e.preventDefault();
    const ok = await run(() =>
      api.put("/pricing-settings/category-defaults", {
        category: v.category,
        weightKg: Number(v.weightKg),
        lengthCm: numOrNull(v.lengthCm),
        widthCm: numOrNull(v.widthCm),
        heightCm: numOrNull(v.heightCm),
      }),
    );
    if (ok) setV(emptyCategory);
  }

  return (
    <Section id="category-defaults" step={6} need="optional" title={t("title")} intro={t("intro")}>
      {settings.categoryDefaults.length > 0 && (
        <SavedList>
          {settings.categoryDefaults.map((c) => (
            <SavedRow
              key={c.id}
              actions={
                <Button variant="ghost" size="s" onClick={() => run(() => api.delete(`/pricing-settings/category-defaults/${c.id}`))}>
                  {t("remove")}
                </Button>
              }
            >
              <span className="font-semibold">{c.category}</span> · {f.number(Number(c.weightKg), 3)} kg
              {c.lengthCm && c.widthCm && c.heightCm && (
                <span className="text-ink-muted">
                  {" "}
                  · {f.number(Number(c.lengthCm))} × {f.number(Number(c.widthCm))} × {f.number(Number(c.heightCm))} cm
                </span>
              )}
            </SavedRow>
          ))}
        </SavedList>
      )}
      <form onSubmit={submit} className="grid gap-4">
        <RequiredNote className="col-span-full" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))]">
          <Field label={t("category")}>
            <input className={input} required value={v.category} onChange={set("category")} />
          </Field>
          <Field label={t("weight")}>
            <UnitInput unit="kg" required value={v.weightKg} onChange={set("weightKg")} />
          </Field>
          <Field label={t("length")}>
            <UnitInput unit="cm" value={v.lengthCm} onChange={set("lengthCm")} />
          </Field>
          <Field label={t("width")}>
            <UnitInput unit="cm" value={v.widthCm} onChange={set("widthCm")} />
          </Field>
          <Field label={t("height")}>
            <UnitInput unit="cm" value={v.heightCm} onChange={set("heightCm")} />
          </Field>
        </div>
        <FormActions error={error} saved={saved}>
          <Button type="submit" loading={busy}>
            {t("save")}
          </Button>
        </FormActions>
      </form>
    </Section>
  );
}

/**
 * The other hubs' store → hub rates: a route leaving one of them prices with
 * its rate, so it's set here rather than by switching hubs. One row each.
 */
function OtherHubsInbound({ settings, waiting, onSaved }: { settings: Settings; waiting: string[]; onSaved: () => Promise<void> }) {
  const t = useTranslations("pricing.settings.otherHubs");
  if (!settings.otherHubs.length) return null;
  return (
    <Section id="other-hubs" step={4} need="required" title={t("title")} intro={t("intro")}>
      <div className="grid gap-3">
        {settings.otherHubs.map((h) => (
          <HubInboundRow key={h.id} hub={h} waiting={waiting.includes(h.name)} onSaved={onSaved} />
        ))}
      </div>
    </Section>
  );
}

function HubInboundRow({ hub, waiting, onSaved }: { hub: Settings["otherHubs"][number]; waiting: boolean; onSaved: () => Promise<void> }) {
  const t = useTranslations("pricing.settings.otherHubs");
  const tm = useTranslations("pricing.settings.margins.inbound");
  const [v, setV] = useState({ inboundFee: str(hub.inboundFee), inboundPerKg: str(hub.inboundPerKg) });
  const { busy, error, saved, run } = useSubmit(onSaved);
  function submit(e: FormEvent) {
    e.preventDefault();
    run(() => api.put(`/pricing-settings/hubs/${hub.id}/inbound`, { inboundFee: Number(v.inboundFee), inboundPerKg: Number(v.inboundPerKg) }));
  }
  return (
    <form onSubmit={submit} className="grid items-end gap-3 rounded-[var(--radius-m)] border border-line p-3 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)_minmax(0,1fr)_auto]">
      <div className="min-w-0 self-center">
        <p className="font-semibold">{hub.name}</p>
        <p className="text-xs text-ink-muted">{waiting ? <Badge variant="attn">{t("waiting")}</Badge> : hub.inboundFee == null && hub.inboundPerKg == null ? t("notSet") : t("set")}</p>
      </div>
      <Field label={tm("fee", { currency: hub.currency })}>
        <UnitInput unit={hub.currency} required value={v.inboundFee} onChange={(e) => setV({ ...v, inboundFee: e.target.value })} />
      </Field>
      <Field label={tm("perKg", { currency: hub.currency })}>
        <UnitInput unit={`${hub.currency}/kg`} required value={v.inboundPerKg} onChange={(e) => setV({ ...v, inboundPerKg: e.target.value })} />
      </Field>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" size="s" loading={busy}>
          {t("save")}
        </Button>
        {saved && !error && <span role="status" className="text-xs text-positive">{t("saved")}</span>}
        {error && (
          <span role="alert" className="text-xs text-critical">
            {error}
          </span>
        )}
      </div>
    </form>
  );
}
