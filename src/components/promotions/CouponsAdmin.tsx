"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { api } from "@/lib/apiClient";
import Button from "@/components/ui/button/Button";
import { Field, input } from "@/components/ui/form/Form";

interface Coupon {
  id: string;
  code: string;
  kind: "PERCENT" | "AMOUNT";
  percentBps: number | null;
  amountMinor: number | null;
  currency: string;
  minItemMinor: number;
  maxRedemptions: number | null;
  maxPerCustomer: number | null;
  active: boolean;
  redeemed: number;
}

export function CouponsAdmin() {
  const t = useTranslations("promotions");
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [f, setF] = useState({ code: "", kind: "PERCENT" as "PERCENT" | "AMOUNT", percentBps: "1000", amountMinor: "", minItemMinor: "0" });
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setCoupons((await api.get<{ coupons: Coupon[] }>("/coupons")).coupons);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function add(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post("/coupons", {
        code: f.code,
        kind: f.kind,
        ...(f.kind === "PERCENT" ? { percentBps: Number(f.percentBps) } : { amountMinor: Number(f.amountMinor) }),
        minItemMinor: Number(f.minItemMinor) || 0,
      });
      setF({ code: "", kind: "PERCENT", percentBps: "1000", amountMinor: "", minItemMinor: "0" });
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function setActive(id: string, active: boolean) {
    setError(null);
    try {
      await api.patch(`/coupons/${id}`, { active });
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="rb-headline text-[28px]">{t("title")}</h1>
      <p className="text-sm text-ink-muted">{t("lead")}</p>
      <form onSubmit={add} className="grid gap-3 rounded-[var(--radius-m)] border border-line bg-surface-raised p-4 sm:grid-cols-5">
        <Field label={t("code")}>
          <input className={input} value={f.code} onChange={(e) => setF((x) => ({ ...x, code: e.target.value }))} required maxLength={20} pattern="[A-Za-z0-9][A-Za-z0-9_-]{2,19}" />
        </Field>
        <Field label={t("kind")}>
          <select className={input} value={f.kind} onChange={(e) => setF((x) => ({ ...x, kind: e.target.value as "PERCENT" | "AMOUNT" }))}>
            <option value="PERCENT">{t("kinds.PERCENT")}</option>
            <option value="AMOUNT">{t("kinds.AMOUNT")}</option>
          </select>
        </Field>
        {f.kind === "PERCENT" ? (
          <Field label={t("percentBps")} hint={t("percentBpsHint")}>
            <input className={input} type="number" min={1} max={10000} value={f.percentBps} onChange={(e) => setF((x) => ({ ...x, percentBps: e.target.value }))} required />
          </Field>
        ) : (
          <Field label={t("amountMinor")}>
            <input className={input} type="number" min={1} value={f.amountMinor} onChange={(e) => setF((x) => ({ ...x, amountMinor: e.target.value }))} required />
          </Field>
        )}
        <Field label={t("minItemMinor")}>
          <input className={input} type="number" min={0} value={f.minItemMinor} onChange={(e) => setF((x) => ({ ...x, minItemMinor: e.target.value }))} />
        </Field>
        <div className="flex items-end">
          <Button type="submit" variant="primary">
            {t("add")}
          </Button>
        </div>
      </form>
      {error ? (
        <p role="alert" className="text-sm text-critical">
          {error}
        </p>
      ) : null}
      <ul className="divide-y divide-line rounded-[var(--radius-m)] border border-line bg-surface-raised">
        {coupons.map((c) => (
          <li key={c.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
            <span className="rb-mono-s font-medium">{c.code}</span>
            <span className="text-ink-muted">{c.kind === "PERCENT" ? t("percentOf", { bps: c.percentBps ?? 0 }) : `${c.amountMinor} ${c.currency}`}</span>
            <span className="text-ink-muted">{t("redeemed", { used: c.redeemed, max: c.maxRedemptions ?? "∞" })}</span>
            <span className={c.active ? "text-positive" : "text-ink-muted"}>{c.active ? t("active") : t("inactive")}</span>
            <Button type="button" variant="secondary" onClick={() => setActive(c.id, !c.active)}>
              {c.active ? t("deactivate") : t("activate")}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
