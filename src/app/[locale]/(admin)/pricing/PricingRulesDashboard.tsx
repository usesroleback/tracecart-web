"use client";

import { FormEvent, useState } from "react";
import { useTranslations } from "next-intl";
import { api } from "@/lib/apiClient";
import Button from "@/components/ui/button/Button";
import { Badge } from "@/components/ui/badge/Badge";
import { Card } from "@/components/ui/card/Card";
import { DsPlusIcon } from "@/icons";
import { HANDLING_FLAGS, PRICE_COMPONENTS, PRICE_METHODS, PriceMethod, PricingRule } from "@/lib/types";
import { useFormat } from "@/lib/format";
import { CountryInput, CurrencyInput, Field, FormActions, FormSection, input, RangeInputs, UnitInput, RequiredNote } from "@/components/ui/form/Form";

const TH = "sticky top-0 whitespace-nowrap border-b border-line bg-surface-sunken px-3 py-2 text-left text-[12px] font-[650] uppercase tracking-[0.04em] text-ink-muted";
const TD = "border-b border-line px-3 py-2 align-top";

const PERCENT_METHODS: PriceMethod[] = ["PERCENT_OF_PRODUCT", "PERCENT_OF_DECLARED_VALUE"];

/**
 * Pricing rules (docs/design/pricing-routing-and-customs.md): one row per
 * rule at its latest version, what it charges and when it applies. Changing a
 * rule saves its next version; the history toggle shows every version.
 */
export function PricingRulesDashboard({ initialRules }: { initialRules: PricingRule[] }) {
  const t = useTranslations("pricing");
  const tl = useTranslations("labels");
  const f = useFormat();
  const [rules, setRules] = useState(initialRules);
  const [history, setHistory] = useState(false);
  const [editing, setEditing] = useState<PricingRule | "new" | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load(withHistory = history) {
    setRules(await api.get<PricingRule[]>(`/pricing-rules${withHistory ? "?history=true" : ""}`));
  }

  async function deactivate(rule: PricingRule) {
    setBusyId(rule.id);
    try {
      await api.post(`/pricing-rules/${rule.id}/deactivate`);
      await load();
    } finally {
      setBusyId(null);
    }
  }

  const rate = (r: PricingRule) => {
    const amount = Number(r.amount);
    const base = PERCENT_METHODS.includes(r.method) ? f.percent(amount) : f.money(amount, r.currency);
    const bounds = [r.minAmount && `min ${f.money(r.minAmount, r.currency)}`, r.maxAmount && `max ${f.money(r.maxAmount, r.currency)}`].filter(Boolean).join(" · ");
    return (
      <>
        <span className="tabular-nums">{base}</span> <span className="text-ink-muted">{tl(`priceMethod.${r.method}`)}</span>
        {bounds && <span className="block text-xs text-ink-muted">{bounds}</span>}
      </>
    );
  };

  const conditions = (r: PricingRule) => {
    const parts = [
      r.destinationCountry && t("cond.country", { country: r.destinationCountry }),
      r.intakeType && t(`intake.${r.intakeType}`),
      r.handlingFlag && tl(`handlingFlag.${r.handlingFlag}`),
      r.productCategory,
      (r.minWeightKg || r.maxWeightKg) && t("cond.weight", { min: r.minWeightKg ?? "0", max: r.maxWeightKg ?? "∞" }),
      (r.minQuantity || r.maxQuantity) && t("cond.quantity", { min: r.minQuantity ?? 1, max: r.maxQuantity ?? "∞" }),
    ].filter(Boolean);
    return (
      <>
        {parts.length ? parts.join(" · ") : t("always")}
        {r.priority !== 0 && <span className="block text-xs text-ink-muted">{t("priority", { priority: r.priority })}</span>}
        {r.rateSource && <span className="block text-xs text-ink-muted">{t("source", { source: r.rateSource })}</span>}
      </>
    );
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <h2 className="rb-headline text-[28px]">{t("title")}</h2>
          <p className="mt-1 text-sm text-ink-muted">{t("intro")}</p>
        </div>
        <Button startIcon={<DsPlusIcon width={18} height={18} />} onClick={() => setEditing("new")}>
          {t("new")}
        </Button>
      </div>

      {editing && (
        <Card padding={24} className="mt-6">
          <RuleForm
            rule={editing === "new" ? null : editing}
            onCancel={() => setEditing(null)}
            onSaved={async () => {
              setEditing(null);
              await load();
            }}
          />
        </Card>
      )}

      <label className="mt-6 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={history}
          onChange={async (e) => {
            setHistory(e.target.checked);
            await load(e.target.checked);
          }}
        />
        {t("showHistory")}
      </label>

      {rules.length === 0 ? (
        <p className="mt-4 text-sm text-ink-muted">{t("empty")}</p>
      ) : (
        <div tabIndex={0} className="mt-3 overflow-x-auto rounded-[var(--radius-m)] border border-line bg-surface-raised">
          <table className="w-full min-w-[760px] border-separate border-spacing-0 text-sm">
            <caption className="sr-only">{t("caption")}</caption>
            <thead>
              <tr>
                <th className={TH}>{t("col.rule")}</th>
                <th className={TH}>{t("col.component")}</th>
                <th className={TH}>{t("col.rate")}</th>
                <th className={TH}>{t("col.when")}</th>
                <th className={TH}>{t("col.version")}</th>
                <th className={`${TH} text-right`}>{t("col.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((r) => (
                <tr key={r.id} className={r.active ? "" : "text-ink-muted"}>
                  <td className={TD}>
                    <span className="rb-mono font-semibold">{r.code}</span>
                    {r.description && <span className="block text-xs text-ink-muted">{r.description}</span>}
                  </td>
                  <td className={TD}>{tl(`priceComponent.${r.component}`)}</td>
                  <td className={TD}>{rate(r)}</td>
                  <td className={TD}>{conditions(r)}</td>
                  <td className={TD}>
                    v{r.version} {!r.active && <Badge variant="outline">{t("inactive")}</Badge>}
                    <span className="block text-xs text-ink-muted">{f.date(r.effectiveFrom)}</span>
                  </td>
                  <td className={`${TD} text-right`}>
                    {r.active && (
                      <div className="flex justify-end gap-2">
                        <Button variant="secondary" size="s" onClick={() => setEditing(r)}>
                          {t("edit")}
                        </Button>
                        <Button variant="ghost" size="s" loading={busyId === r.id} onClick={() => deactivate(r)}>
                          {t("deactivate")}
                        </Button>
                      </div>
                    )}
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
const textOrNull = (v: string) => (v.trim() === "" ? null : v.trim());

/** Creates a rule, or saves the next version of one. */
function RuleForm({ rule, onCancel, onSaved }: { rule: PricingRule | null; onCancel: () => void; onSaved: () => void }) {
  const t = useTranslations("pricing");
  const tl = useTranslations("labels");
  const [v, setV] = useState({
    code: rule?.code ?? "",
    component: rule?.component ?? "PICKUP",
    method: rule?.method ?? "FIXED",
    amount: str(rule?.amount),
    currency: rule?.currency ?? "XOF",
    minAmount: str(rule?.minAmount),
    maxAmount: str(rule?.maxAmount),
    priority: str(rule?.priority ?? 0),
    destinationCountry: str(rule?.destinationCountry),
    intakeType: rule?.intakeType ?? "",
    handlingFlag: rule?.handlingFlag ?? "",
    productCategory: str(rule?.productCategory),
    minWeightKg: str(rule?.minWeightKg),
    maxWeightKg: str(rule?.maxWeightKg),
    minQuantity: str(rule?.minQuantity),
    maxQuantity: str(rule?.maxQuantity),
    rateSource: str(rule?.rateSource),
    description: str(rule?.description),
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof v) => (e: { target: { value: string } }) => setV({ ...v, [k]: e.target.value });

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const body = {
      component: v.component,
      method: v.method,
      amount: Number(v.amount),
      currency: v.currency.trim().toUpperCase(),
      minAmount: numOrNull(v.minAmount),
      maxAmount: numOrNull(v.maxAmount),
      priority: Number(v.priority) || 0,
      destinationCountry: textOrNull(v.destinationCountry),
      intakeType: v.intakeType || null,
      handlingFlag: v.handlingFlag || null,
      productCategory: textOrNull(v.productCategory),
      minWeightKg: numOrNull(v.minWeightKg),
      maxWeightKg: numOrNull(v.maxWeightKg),
      minQuantity: numOrNull(v.minQuantity),
      maxQuantity: numOrNull(v.maxQuantity),
      rateSource: textOrNull(v.rateSource),
      lastVerifiedAt: textOrNull(v.rateSource) ? new Date().toISOString() : null,
      description: textOrNull(v.description),
    };
    try {
      if (rule) await api.post(`/pricing-rules/${rule.id}/revise`, body);
      else await api.post("/pricing-rules", { code: v.code.trim().toUpperCase(), ...body });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("failed"));
    } finally {
      setBusy(false);
    }
  }

  const percent = PERCENT_METHODS.includes(v.method as PriceMethod);
  const currency = v.currency.trim().toUpperCase() || "—";
  return (
    <form onSubmit={submit} className="grid gap-6">
      <RequiredNote className="col-span-full" />
      <FormSection title={t("form.charges")}>
        <Field label={t("field.code")} hint={t("field.codeHint")}>
          <input className={`${input} rb-mono uppercase`} required value={v.code} onChange={set("code")} disabled={!!rule} pattern="[A-Za-z0-9][A-Za-z0-9_\-]{1,40}" />
        </Field>
        <Field label={t("field.component")}>
          <select className={input} value={v.component} onChange={set("component")}>
            {PRICE_COMPONENTS.map((c) => (
              <option key={c} value={c}>
                {tl(`priceComponent.${c}`)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("field.method")}>
          <select className={input} value={v.method} onChange={set("method")}>
            {PRICE_METHODS.map((m) => (
              <option key={m} value={m}>
                {tl(`priceMethod.${m}`)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={percent ? t("form.rate") : t("form.amount")} hint={percent ? t("form.rateHint") : t("form.amountHint")}>
          <UnitInput unit={percent ? "%" : currency} required value={v.amount} onChange={set("amount")} />
        </Field>
        <Field label={t("field.currency")} hint={t("form.currencyHint")}>
          <CurrencyInput required value={v.currency} onChange={set("currency")} />
        </Field>
        <Field label={t("form.bounds")} hint={t("form.boundsHint")}>
          <RangeInputs
            unit={currency}
            labels={{ min: t("field.minAmount"), max: t("field.maxAmount") }}
            min={{ value: v.minAmount, onChange: set("minAmount") }}
            max={{ value: v.maxAmount, onChange: set("maxAmount") }}
          />
        </Field>
      </FormSection>

      <FormSection title={t("form.when")}>
        <Field label={t("field.destinationCountry")} hint={t("form.anyHint")}>
          <CountryInput placeholder={t("field.any")} value={v.destinationCountry} onChange={set("destinationCountry")} />
        </Field>
        <Field label={t("field.intakeType")}>
          <select className={input} value={v.intakeType} onChange={set("intakeType")}>
            <option value="">{t("field.any")}</option>
            <option value="BUY_ON_BEHALF">{t("intake.BUY_ON_BEHALF")}</option>
            <option value="CUSTOMER_OWNED">{t("intake.CUSTOMER_OWNED")}</option>
          </select>
        </Field>
        <Field label={t("field.handlingFlag")}>
          <select className={input} value={v.handlingFlag} onChange={set("handlingFlag")}>
            <option value="">{t("field.any")}</option>
            {HANDLING_FLAGS.map((fl) => (
              <option key={fl} value={fl}>
                {tl(`handlingFlag.${fl}`)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("field.productCategory")} hint={t("form.anyHint")}>
          <input className={input} placeholder={t("field.any")} value={v.productCategory} onChange={set("productCategory")} />
        </Field>
        <Field label={t("form.weight")}>
          <RangeInputs
            unit="kg"
            labels={{ min: t("form.from"), max: t("form.to") }}
            min={{ value: v.minWeightKg, onChange: set("minWeightKg") }}
            max={{ value: v.maxWeightKg, onChange: set("maxWeightKg") }}
          />
        </Field>
        <Field label={t("field.quantity")}>
          <RangeInputs
            labels={{ min: t("form.from"), max: t("form.to") }}
            min={{ value: v.minQuantity, onChange: set("minQuantity"), step: "1" }}
            max={{ value: v.maxQuantity, onChange: set("maxQuantity"), step: "1" }}
          />
        </Field>
        <Field label={t("field.priority")} hint={t("form.priorityHint")}>
          <input type="number" step="1" className={input} value={v.priority} onChange={set("priority")} />
        </Field>
      </FormSection>

      <FormSection title={t("form.record")} columns={2}>
        <Field label={t("field.rateSource")} hint={t("form.rateSourceHint")}>
          <input className={input} value={v.rateSource} onChange={set("rateSource")} />
        </Field>
        <Field label={t("field.description")} hint={t("form.descriptionHint")}>
          <input className={input} value={v.description} onChange={set("description")} />
        </Field>
      </FormSection>

      <FormActions error={error}>
        <Button type="submit" loading={busy}>
          {rule ? t("saveVersion", { version: rule.version + 1 }) : t("save")}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          {t("cancel")}
        </Button>
      </FormActions>
    </form>
  );
}
