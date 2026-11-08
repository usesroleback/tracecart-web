"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { api } from "@/lib/apiClient";
import { useFormat } from "@/lib/format";
import { Badge } from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { input } from "@/components/ui/form/Form";
import { pick, PRODUCT_STATUSES, STATUS_BADGE, type L } from "./types";

interface Row {
  id: string;
  slug: string;
  title: L;
  status: string;
  category: { slug: string; name: L };
  brand: { name: string } | null;
  variantCount: number;
  skus: string[];
  activeOfferCount: number;
  updatedAt: string;
}

/** The back office's product list: search, status, and more pages on demand. */
export function ProductsTable({ canWrite }: { canWrite: boolean }) {
  const t = useTranslations("catalogAdmin");
  const locale = useLocale();
  const format = useFormat();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (after: string | null, query: string, st: string) => {
    setLoading(true);
    const params = new URLSearchParams({ limit: "50" });
    if (query.trim()) params.set("q", query.trim());
    if (st) params.set("status", st);
    if (after) params.set("cursor", after);
    try {
      const res = await api.get<{ items: Row[]; nextCursor: string | null }>(`/admin/catalog/products?${params}`);
      setRows((prev) => (after ? [...prev, ...res.items] : res.items));
      setCursor(res.nextCursor);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // The first page, once; load() sets state when the answer arrives.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(null, "", "");
  }, [load]);

  function search(e: FormEvent) {
    e.preventDefault();
    load(null, q, status);
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="rb-headline text-[28px]">{t("products.title")}</h1>
          <p className="mt-1 text-sm text-ink-muted">{t("products.lead")}</p>
        </div>
        {canWrite ? (
          <Button href="/catalog/products/new" variant="primary">
            {t("products.new")}
          </Button>
        ) : null}
      </div>
      <form onSubmit={search} role="search" className="mb-4 flex flex-wrap gap-2">
        <input className={`${input} max-w-md`} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("products.search")} aria-label={t("products.search")} />
        <select
          className={`${input} max-w-[12rem]`}
          value={status}
          aria-label={t("products.columns.status")}
          onChange={(e) => {
            setStatus(e.target.value);
            load(null, q, e.target.value);
          }}
        >
          <option value="">{t("products.allStatuses")}</option>
          {PRODUCT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {t(`status.${s}`)}
            </option>
          ))}
        </select>
        <Button type="submit" variant="secondary">
          {t("products.find")}
        </Button>
      </form>
      {error ? (
        <p role="alert" className="mb-4 text-sm text-critical">
          {error}
        </p>
      ) : null}
      <div tabIndex={0} className="overflow-x-auto rounded-[var(--radius-m)] border border-line bg-surface-raised">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line text-ink-muted">
            <tr>
              <th className="px-4 py-3 font-medium">{t("products.columns.product")}</th>
              <th className="px-4 py-3 font-medium">{t("products.columns.category")}</th>
              <th className="px-4 py-3 font-medium">{t("products.columns.status")}</th>
              <th className="px-4 py-3 text-right font-medium">{t("products.columns.variants")}</th>
              <th className="px-4 py-3 text-right font-medium">{t("products.columns.offers")}</th>
              <th className="px-4 py-3 font-medium">{t("products.columns.updated")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-surface-sunken">
                <td className="px-4 py-3">
                  <Link href={`/catalog/products/${r.id}`} className="font-medium text-ink hover:underline">
                    {pick(r.title, locale)}
                  </Link>
                  <p className="rb-mono-s text-ink-muted">
                    {r.brand ? `${r.brand.name} · ` : ""}
                    {r.skus.join(", ")}
                  </p>
                </td>
                <td className="px-4 py-3 text-ink-muted">{pick(r.category.name, locale)}</td>
                <td className="px-4 py-3">
                  <Badge variant={STATUS_BADGE[r.status]}>{t(`status.${r.status as "DRAFT"}`)}</Badge>
                </td>
                <td className="px-4 py-3 text-right">{r.variantCount}</td>
                <td className="px-4 py-3 text-right">{r.activeOfferCount}</td>
                <td className="px-4 py-3 text-ink-muted">{format.ago(r.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && rows.length === 0 ? <p className="px-4 py-8 text-center text-ink-muted">{t("products.empty")}</p> : null}
      </div>
      {cursor ? (
        <div className="mt-4">
          <Button variant="secondary" loading={loading} onClick={() => load(cursor, q, status)}>
            {t("products.more")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
