"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useFormat } from "@/lib/format";
import { toMajor } from "@/lib/currency";
import { useSession } from "@/context/SessionContext";
import { Badge } from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { Card } from "@/components/ui/card/Card";
import { Field, input } from "@/components/ui/form/Form";
import { ApiError, call } from "@/components/checkout/http";
import type { components } from "@/lib/api/schema";
import type { SourcingCandidate, SourcingRequest } from "@/lib/types";

type CategoryNode = components["schemas"]["CategoryNode"];

interface StaffQuote {
  id: string;
  reference: string;
  status: string;
  currency: string;
  quantity: number;
  totals: { itemMinor: number; shippingMinor: number; dutiesMinor: number; taxesMinor: number; feesMinor: number; totalMinor: number };
  promise: { from: string; to: string };
  validUntil: string;
  createdAt: string;
  product: { slug: string; status: string; offerStatus: string } | null;
}

const TONE: Record<string, "positive" | "attn" | "default" | "critical" | "info"> = { SENT: "info", ACCEPTED: "positive", DECLINED: "critical", EXPIRED: "default", WITHDRAWN: "default" };

const flatten = (nodes: CategoryNode[], trail: string[] = []): { slug: string; label: string }[] =>
  nodes.flatMap((n) => [{ slug: n.slug, label: [...trail, n.name].join(" › ") }, ...flatten(n.children, [...trail, n.name])]);

/**
 * "Find it for me" quotes (ADR-038): the agent's item price, with shipping,
 * duties and fees worked out by the API for the destination; the customer
 * accepts and pays in their account. A merchandiser can then promote the
 * product to the catalogue.
 */
export function SourcingQuotes({ request, selected, categorySlug }: { request: SourcingRequest; selected: SourcingCandidate | null; categorySlug: string | null }) {
  const t = useTranslations("sourcing.quotes");
  const tp = useTranslations("checkout.checkout.problems");
  const format = useFormat();
  const user = useSession();
  const canSend = !!user.permissions?.includes("sourcing.quote.send");
  const canPromote = !!user.permissions?.includes("catalog.product.write");
  const [quotes, setQuotes] = useState<StaffQuote[]>([]);
  const [categories, setCategories] = useState<{ slug: string; label: string }[]>([]);
  const open = request.status !== "CONVERTED" && request.status !== "CLOSED";
  const [f, setF] = useState({
    titleFr: selected?.title ?? request.description,
    titleEn: selected?.title ?? request.description,
    categorySlug: categorySlug ?? "",
    brand: selected?.brand ?? request.brand ?? "",
    unitPrice: "",
    quantity: String(request.quantity),
    weightGrams: "",
    leadMin: "5",
    leadMax: "12",
    countryCode: request.destinationCountry,
    city: request.destinationCity,
    note: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }));

  const load = useCallback(() => call<{ quotes: StaffQuote[] }>("GET", `/sourcing-requests/${request.id}/quotes`).then((r) => setQuotes(r.quotes)), [request.id]);
  useEffect(() => {
    load().catch(() => undefined);
    call<{ categories: CategoryNode[] }>("GET", "/catalog/categories?currency=XOF").then((r) => setCategories(flatten(r.categories)), () => undefined);
  }, [load]);

  async function send(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await call("POST", `/sourcing-requests/${request.id}/quotes`, {
        ...(selected ? { candidateId: selected.id, sourceUrl: selected.url } : {}),
        title: { fr: f.titleFr.trim(), en: f.titleEn.trim() },
        categorySlug: f.categorySlug,
        ...(f.brand.trim() ? { brand: f.brand.trim() } : {}),
        unitPriceMinor: Math.round(Number(f.unitPrice)),
        quantity: Number(f.quantity),
        ...(f.weightGrams ? { weightGrams: Math.round(Number(f.weightGrams)) } : {}),
        leadTimeDaysMin: Number(f.leadMin),
        leadTimeDaysMax: Number(f.leadMax),
        destination: { method: "HOME", countryCode: f.countryCode.toUpperCase(), city: f.city.trim() },
        ...(f.note.trim() ? { note: f.note.trim() } : {}),
      });
      await load();
    } catch (err) {
      if (err instanceof ApiError && err.code === "QUOTE_UNPRICEABLE") {
        const problems = ((err.details as { problems?: { code: string; params?: Record<string, string> }[] })?.problems ?? []).map((p) => tp(p.code as "NO_ZONE", { sku: "", ...p.params }));
        setError(`${err.message}: ${problems.join(" ")}`);
      } else setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function promote(q: StaffQuote) {
    setError(null);
    try {
      await call("POST", `/sourcing-requests/${request.id}/quotes/${q.id}/promote`);
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const money = (minor: number, currency: string) => `${format.number(toMajor(minor, currency))} ${currency}`;
  return (
    <Card padding={24} className="mt-4">
      <h2 className="rb-title">{t("title")}</h2>
      <p className="mt-1 text-sm text-ink-muted">{t("hint")}</p>
      {quotes.length ? (
        <ul className="mt-4 grid gap-2 text-sm">
          {quotes.map((q) => (
            <li key={q.id} className="flex flex-wrap items-center gap-2 border-b border-line pb-2 last:border-b-0">
              <span className="rb-mono">{q.reference}</span>
              <Badge variant={TONE[q.status] ?? "default"}>{t(`status.${q.status}` as "status.SENT")}</Badge>
              <span className="rb-numeral">{money(q.totals.totalMinor, q.currency)}</span>
              <span className="text-ink-muted">{t("breakdown", { item: money(q.totals.itemMinor, q.currency), shipping: money(q.totals.shippingMinor, q.currency), duties: money(q.totals.dutiesMinor + q.totals.taxesMinor + q.totals.feesMinor, q.currency) })}</span>
              {q.product?.status === "ACTIVE" ? (
                <span className="text-positive">{t("inCatalogue")}</span>
              ) : canPromote && q.product ? (
                <Button size="s" variant="secondary" onClick={() => promote(q)}>
                  {t("promote")}
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {canSend && open && request.customerUserId ? (
        <form onSubmit={send} className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
          <Field label={t("titleFr")} required>
            <input className={input} required maxLength={200} value={f.titleFr} onChange={set("titleFr")} />
          </Field>
          <Field label={t("titleEn")} required>
            <input className={input} required maxLength={200} value={f.titleEn} onChange={set("titleEn")} />
          </Field>
          <Field label={t("category")} required>
            <select className={input} required value={f.categorySlug} onChange={set("categorySlug")}>
              <option value="">—</option>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("brand")}>
            <input className={input} maxLength={120} value={f.brand} onChange={set("brand")} />
          </Field>
          <Field label={t("unitPrice")} hint={t("unitPriceHint")} required>
            <input className={input} type="number" min={1} required value={f.unitPrice} onChange={set("unitPrice")} />
          </Field>
          <Field label={t("quantity")} required>
            <input className={input} type="number" min={1} required value={f.quantity} onChange={set("quantity")} />
          </Field>
          <Field label={t("weight")} hint={t("weightHint")}>
            <input className={input} type="number" min={1} value={f.weightGrams} onChange={set("weightGrams")} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("leadMin")} required>
              <input className={input} type="number" min={0} required value={f.leadMin} onChange={set("leadMin")} />
            </Field>
            <Field label={t("leadMax")} required>
              <input className={input} type="number" min={0} required value={f.leadMax} onChange={set("leadMax")} />
            </Field>
          </div>
          <Field label={t("country")} required>
            <input className={input} required maxLength={2} value={f.countryCode} onChange={set("countryCode")} />
          </Field>
          <Field label={t("city")} required>
            <input className={input} required maxLength={120} value={f.city} onChange={set("city")} />
          </Field>
          <Field label={t("note")} className="sm:col-span-2">
            <textarea className={`${input} h-auto py-2`} rows={2} maxLength={1000} value={f.note} onChange={set("note")} />
          </Field>
          {error ? <p className="text-critical sm:col-span-2">{error}</p> : null}
          <div className="sm:col-span-2">
            <Button type="submit" loading={busy}>
              {t("send")}
            </Button>
          </div>
        </form>
      ) : error ? (
        <p className="mt-3 text-sm text-critical">{error}</p>
      ) : null}
      {canSend && open && !request.customerUserId ? <p className="mt-3 text-sm text-ink-muted">{t("noAccount")}</p> : null}
    </Card>
  );
}
