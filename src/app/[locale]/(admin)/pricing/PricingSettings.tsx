"use client";

import { FormEvent, ReactNode, useState } from "react";
import { useTranslations } from "next-intl";
import { api } from "@/lib/apiClient";
import Button from "@/components/ui/button/Button";
import { Badge } from "@/components/ui/badge/Badge";
import { Card } from "@/components/ui/card/Card";
import { PricingSettings as Settings } from "@/lib/types";
import { useFormat } from "@/lib/format";

const input =
  "h-10 w-full rounded-[var(--radius-s)] border border-line-strong bg-surface-raised px-3 text-sm text-ink placeholder:text-ink-muted focus:outline-2 focus:outline-offset-2 focus:outline-focus-ring disabled:opacity-60";
const num = { type: "number", min: "0", step: "any", className: input } as const;

const str = (v: string | number | null | undefined) => (v == null ? "" : String(v));
const numOrNull = (v: string) => (v.trim() === "" ? null : Number(v));

function Field({ label, hint, children, className = "" }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block text-sm ${className}`}>
      <span className="rb-label mb-1 block text-ink">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-muted">{hint}</span>}
    </label>
  );
}

function Section({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  return (
    <Card padding={24} className="mt-6">
      <h2 className="rb-headline text-xl">{title}</h2>
      <p className="mt-1 max-w-3xl text-sm text-ink-muted">{intro}</p>
      <div className="mt-4">{children}</div>
    </Card>
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

function Margins({ settings, onSaved }: { settings: Settings; onSaved: () => Promise<void> }) {
  const t = useTranslations("pricing.settings.margins");
  const m = settings.margins;
  const [tiers, setTiers] = useState((m.productFeeTiers ?? []).map((x) => ({ upTo: str(x.upTo), percent: str(x.percent) })));
  const [v, setV] = useState({ productFeeMin: str(m.productFeeMin), transportMarkupPercent: str(m.transportMarkupPercent), priceBufferPercent: str(m.priceBufferPercent) });
  const { busy, error, run } = useSubmit(onSaved);

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
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-3">
        <div className="sm:col-span-3">
          <p className="rb-label mb-1 text-sm text-ink">{t("tiers")}</p>
          <div className="flex flex-col gap-2">
            {tiers.map((tier, i) => (
              <div key={i} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-2">
                <input
                  {...num}
                  aria-label={t("upTo", { currency: m.currency })}
                  placeholder={t("noLimit")}
                  value={tier.upTo}
                  onChange={(e) => setTiers(tiers.map((x, j) => (j === i ? { ...x, upTo: e.target.value } : x)))}
                />
                <input
                  {...num}
                  aria-label={t("percent")}
                  placeholder="%"
                  value={tier.percent}
                  onChange={(e) => setTiers(tiers.map((x, j) => (j === i ? { ...x, percent: e.target.value } : x)))}
                />
                <Button variant="ghost" size="s" onClick={() => setTiers(tiers.filter((_, j) => j !== i))}>
                  {t("remove")}
                </Button>
              </div>
            ))}
          </div>
          <p className="mt-1 text-xs text-ink-muted">{t("tiersHint", { currency: m.currency })}</p>
          <Button variant="secondary" size="s" className="mt-2" onClick={() => setTiers([...tiers, { upTo: "", percent: "" }])}>
            {t("addTier")}
          </Button>
        </div>
        <Field label={t("min", { currency: m.currency })}>
          <input {...num} value={v.productFeeMin} onChange={(e) => setV({ ...v, productFeeMin: e.target.value })} />
        </Field>
        <Field label={t("markup")} hint={t("markupHint")}>
          <input {...num} max="100" value={v.transportMarkupPercent} onChange={(e) => setV({ ...v, transportMarkupPercent: e.target.value })} />
        </Field>
        <Field label={t("buffer")} hint={t("bufferHint")}>
          <input {...num} max="50" value={v.priceBufferPercent} onChange={(e) => setV({ ...v, priceBufferPercent: e.target.value })} />
        </Field>
        <div className="flex items-center gap-2 sm:col-span-3">
          <Button type="submit" loading={busy}>
            {t("save")}
          </Button>
          {error && <p className="text-sm text-critical">{error}</p>}
        </div>
      </form>
    </Section>
  );
}

function ExchangeRates({ settings, onSaved }: { settings: Settings; onSaved: () => Promise<void> }) {
  const t = useTranslations("pricing.settings.fx");
  const f = useFormat();
  const [v, setV] = useState({ currency: "", toCurrency: settings.margins.currency, rate: "", source: "" });
  const { busy, error, run } = useSubmit(onSaved);

  return (
    <Section title={t("title")} intro={t("intro")}>
      {settings.exchangeRates.length > 0 && (
        <ul className="mb-4 grid gap-1 text-sm">
          {settings.exchangeRates.map((r) => (
            <li key={r.id} className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line py-1">
              <span>
                <span className="font-semibold tabular-nums">
                  1 {r.currency} = {f.number(Number(r.rate), 6)} {r.toCurrency}
                </span>{" "}
                <span className="text-ink-muted">
                  · {f.date(r.updatedAt)}
                  {r.source && ` · ${r.source}`}
                </span>
              </span>
              <Button variant="ghost" size="s" onClick={() => run(() => api.delete(`/pricing-settings/exchange-rates/${r.id}`))}>
                {t("remove")}
              </Button>
            </li>
          ))}
        </ul>
      )}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (await run(() => api.put("/pricing-settings/exchange-rates", { ...v, rate: Number(v.rate), source: v.source.trim() || null })))
            setV({ ...v, currency: "", rate: "", source: "" });
        }}
        className="grid gap-3 sm:grid-cols-5"
      >
        <Field label={t("from")}>
          <input className={`${input} uppercase`} required maxLength={3} placeholder="EUR" value={v.currency} onChange={(e) => setV({ ...v, currency: e.target.value })} />
        </Field>
        <Field label={t("rate")}>
          <input {...num} required value={v.rate} onChange={(e) => setV({ ...v, rate: e.target.value })} />
        </Field>
        <Field label={t("to")}>
          <input className={`${input} uppercase`} required maxLength={3} value={v.toCurrency} onChange={(e) => setV({ ...v, toCurrency: e.target.value })} />
        </Field>
        <Field label={t("source")}>
          <input className={input} value={v.source} onChange={(e) => setV({ ...v, source: e.target.value })} />
        </Field>
        <div className="flex items-end gap-2">
          <Button type="submit" loading={busy}>
            {t("save")}
          </Button>
        </div>
        {error && <p className="text-sm text-critical sm:col-span-5">{error}</p>}
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
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: e.target.value });

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
    const ok = await run(() => (editing ? api.patch(`/pricing-settings/customs-rates/${editing}`, body) : api.post("/pricing-settings/customs-rates", body)));
    if (ok) {
      setEditing(null);
      setV({ ...emptyCustoms, currency: settings.margins.currency });
    }
  }

  return (
    <Section title={t("title")} intro={t("intro")}>
      {settings.customsRates.length > 0 && (
        <ul className="mb-4 grid gap-1 text-sm">
          {settings.customsRates.map((r) => (
            <li key={r.id} className={`flex flex-wrap items-baseline justify-between gap-2 border-b border-line py-1 ${r.active ? "" : "text-ink-muted"}`}>
              <span>
                <span className="font-semibold">{r.destinationCountry}</span> · {r.productCategory ?? t("anyCategory")} ·{" "}
                <span className="tabular-nums">{t("summary", { duty: f.percent(Number(r.dutyPercent)), tax: f.percent(Number(r.taxPercent)) })}</span>
                {r.brokerFee && <span className="text-ink-muted"> · {t("broker", { amount: f.money(r.brokerFee, r.currency) })}</span>}{" "}
                {!r.active && <Badge variant="outline">{t("off")}</Badge>}
              </span>
              <span className="flex gap-2">
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
              </span>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Field label={t("country")}>
          <input className={input} required value={v.destinationCountry} onChange={set("destinationCountry")} />
        </Field>
        <Field label={t("category")}>
          <input className={input} placeholder={t("anyCategory")} value={v.productCategory} onChange={set("productCategory")} />
        </Field>
        <Field label={t("duty")}>
          <input {...num} required value={v.dutyPercent} onChange={set("dutyPercent")} />
        </Field>
        <Field label={t("tax")}>
          <input {...num} value={v.taxPercent} onChange={set("taxPercent")} />
        </Field>
        <Field label={t("brokerFee")}>
          <input {...num} value={v.brokerFee} onChange={set("brokerFee")} />
        </Field>
        <Field label={t("currency")}>
          <input className={`${input} uppercase`} required maxLength={3} value={v.currency} onChange={set("currency")} />
        </Field>
        <div className="flex flex-wrap items-center gap-2 sm:col-span-3 lg:col-span-6">
          <Button type="submit" loading={busy}>
            {editing ? t("update") : t("add")}
          </Button>
          {editing && (
            <Button
              variant="ghost"
              onClick={() => {
                setEditing(null);
                setV({ ...emptyCustoms, currency: settings.margins.currency });
              }}
            >
              {t("cancel")}
            </Button>
          )}
          {error && <p className="text-sm text-critical">{error}</p>}
        </div>
      </form>
    </Section>
  );
}

function CategoryDefaults({ settings, onSaved }: { settings: Settings; onSaved: () => Promise<void> }) {
  const t = useTranslations("pricing.settings.categories");
  const f = useFormat();
  const [v, setV] = useState({ category: "", weightKg: "", lengthCm: "", widthCm: "", heightCm: "" });
  const { busy, error, run } = useSubmit(onSaved);
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: e.target.value });

  return (
    <Section title={t("title")} intro={t("intro")}>
      {settings.categoryDefaults.length > 0 && (
        <ul className="mb-4 grid gap-1 text-sm">
          {settings.categoryDefaults.map((c) => (
            <li key={c.id} className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line py-1">
              <span>
                <span className="font-semibold">{c.category}</span> · {f.number(Number(c.weightKg), 3)} kg
                {c.lengthCm && c.widthCm && c.heightCm && (
                  <span className="text-ink-muted">
                    {" "}
                    · {f.number(Number(c.lengthCm))} × {f.number(Number(c.widthCm))} × {f.number(Number(c.heightCm))} cm
                  </span>
                )}
              </span>
              <Button variant="ghost" size="s" onClick={() => run(() => api.delete(`/pricing-settings/category-defaults/${c.id}`))}>
                {t("remove")}
              </Button>
            </li>
          ))}
        </ul>
      )}
      <form
        onSubmit={async (e) => {
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
          if (ok) setV({ category: "", weightKg: "", lengthCm: "", widthCm: "", heightCm: "" });
        }}
        className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6"
      >
        <Field label={t("category")}>
          <input className={input} required value={v.category} onChange={set("category")} />
        </Field>
        <Field label={t("weight")}>
          <input {...num} required value={v.weightKg} onChange={set("weightKg")} />
        </Field>
        <Field label={t("length")}>
          <input {...num} value={v.lengthCm} onChange={set("lengthCm")} />
        </Field>
        <Field label={t("width")}>
          <input {...num} value={v.widthCm} onChange={set("widthCm")} />
        </Field>
        <Field label={t("height")}>
          <input {...num} value={v.heightCm} onChange={set("heightCm")} />
        </Field>
        <div className="flex items-end gap-2">
          <Button type="submit" loading={busy}>
            {t("save")}
          </Button>
        </div>
        {error && <p className="text-sm text-critical sm:col-span-3 lg:col-span-6">{error}</p>}
      </form>
    </Section>
  );
}
