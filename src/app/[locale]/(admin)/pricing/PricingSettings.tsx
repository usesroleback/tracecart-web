"use client";

import { FormEvent, ReactNode, useState } from "react";
import { useTranslations } from "next-intl";
import { api } from "@/lib/apiClient";
import Button from "@/components/ui/button/Button";
import { Badge } from "@/components/ui/badge/Badge";
import { Card } from "@/components/ui/card/Card";
import { CountryInput, CurrencyInput, Field, FormActions, input, UnitInput, RequiredNote } from "@/components/ui/form/Form";
import { PricingSettings as Settings } from "@/lib/types";
import { useFormat } from "@/lib/format";

const str = (v: string | number | null | undefined) => (v == null ? "" : String(v));
const numOrNull = (v: string) => (v.trim() === "" ? null : Number(v));

function Section({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  return (
    <Card padding={24} className="mt-6">
      <h2 className="rb-headline text-xl">{title}</h2>
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
  const reload = async () => setSettings(await api.get<Settings>("/pricing-settings"));

  return (
    <div className="mt-12">
      <h2 className="rb-headline text-[28px]">{t("title")}</h2>
      <p className="mt-1 max-w-3xl text-sm text-ink-muted">{t("subtitle")}</p>
      <Margins settings={settings} onSaved={reload} />
      <ExchangeRates settings={settings} onSaved={reload} />
      <CustomsRates settings={settings} onSaved={reload} />
      <CategoryDefaults settings={settings} onSaved={reload} />
    </div>
  );
}

function useSubmit(onSaved: () => Promise<void>) {
  const t = useTranslations("pricing.settings");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await onSaved();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : t("failed"));
      return false;
    } finally {
      setBusy(false);
    }
  }
  return { busy, error, run };
}

const TIER_GRID = "grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_5.5rem] items-center gap-2";

function Margins({ settings, onSaved }: { settings: Settings; onSaved: () => Promise<void> }) {
  const t = useTranslations("pricing.settings.margins");
  const m = settings.margins;
  const [tiers, setTiers] = useState((m.productFeeTiers ?? []).map((x) => ({ upTo: str(x.upTo), percent: str(x.percent) })));
  const [v, setV] = useState({ productFeeMin: str(m.productFeeMin), transportMarkupPercent: str(m.transportMarkupPercent), priceBufferPercent: str(m.priceBufferPercent) });
  const { busy, error, run } = useSubmit(onSaved);
  const setTier = (i: number, k: "upTo" | "percent", value: string) => setTiers(tiers.map((x, j) => (j === i ? { ...x, [k]: value } : x)));

  function submit(e: FormEvent) {
    e.preventDefault();
    run(() =>
      api.put("/pricing-settings/margins", {
        productFeeTiers: tiers.filter((x) => x.percent.trim() !== "").map((x) => ({ upTo: numOrNull(x.upTo), percent: Number(x.percent) })),
        productFeeMin: numOrNull(v.productFeeMin),
        transportMarkupPercent: Number(v.transportMarkupPercent) || 0,
        priceBufferPercent: Number(v.priceBufferPercent) || 0,
      }),
    );
  }

  return (
    <Section title={t("title", { hub: m.name })} intro={t("intro", { currency: m.currency })}>
      <form onSubmit={submit} className="grid gap-6">
        <div className="max-w-xl">
          <p className="rb-label mb-2 text-sm text-ink">{t("tiers")}</p>
          {tiers.length > 0 && (
            <div className={`${TIER_GRID} mb-1 text-xs text-ink-muted`}>
              <span>{t("upTo", { currency: m.currency })}</span>
              <span>{t("percent")}</span>
            </div>
          )}
          <div className="flex flex-col gap-2">
            {tiers.map((tier, i) => (
              <div key={i} className={TIER_GRID}>
                <UnitInput unit={m.currency} aria-label={t("upTo", { currency: m.currency })} placeholder={t("noLimit")} value={tier.upTo} onChange={(e) => setTier(i, "upTo", e.target.value)} />
                <UnitInput unit="%" max="100" aria-label={t("percent")} value={tier.percent} onChange={(e) => setTier(i, "percent", e.target.value)} />
                <Button variant="ghost" size="s" onClick={() => setTiers(tiers.filter((_, j) => j !== i))}>
                  {t("remove")}
                </Button>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-ink-muted">{t("tiersHint", { currency: m.currency })}</p>
          <Button variant="secondary" size="s" className="mt-2" onClick={() => setTiers([...tiers, { upTo: "", percent: "" }])}>
            {t("addTier")}
          </Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={t("min", { currency: m.currency })}>
            <UnitInput unit={m.currency} value={v.productFeeMin} onChange={(e) => setV({ ...v, productFeeMin: e.target.value })} />
          </Field>
          <Field label={t("markup")} hint={t("markupHint")}>
            <UnitInput unit="%" max="100" value={v.transportMarkupPercent} onChange={(e) => setV({ ...v, transportMarkupPercent: e.target.value })} />
          </Field>
          <Field label={t("buffer")} hint={t("bufferHint")}>
            <UnitInput unit="%" max="50" value={v.priceBufferPercent} onChange={(e) => setV({ ...v, priceBufferPercent: e.target.value })} />
          </Field>
        </div>
        <FormActions error={error}>
          <Button type="submit" loading={busy}>
            {t("save")}
          </Button>
        </FormActions>
      </form>
    </Section>
  );
}

function ExchangeRates({ settings, onSaved }: { settings: Settings; onSaved: () => Promise<void> }) {
  const t = useTranslations("pricing.settings.fx");
  const f = useFormat();
  const [v, setV] = useState({ currency: "", toCurrency: settings.margins.currency, rate: "", source: "" });
  const { busy, error, run } = useSubmit(onSaved);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (await run(() => api.put("/pricing-settings/exchange-rates", { ...v, rate: Number(v.rate), source: v.source.trim() || null }))) {
      setV({ ...v, currency: "", rate: "", source: "" });
    }
  }

  return (
    <Section title={t("title")} intro={t("intro")}>
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
        <FormActions error={error}>
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
  const { busy, error, run } = useSubmit(onSaved);
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
    <Section title={t("title")} intro={t("intro")}>
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
        <FormActions error={error}>
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
  const { busy, error, run } = useSubmit(onSaved);
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
    <Section title={t("title")} intro={t("intro")}>
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
        <FormActions error={error}>
          <Button type="submit" loading={busy}>
            {t("save")}
          </Button>
        </FormActions>
      </form>
    </Section>
  );
}
