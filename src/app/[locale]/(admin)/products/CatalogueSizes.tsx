"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { api } from "@/lib/apiClient";
import Button from "@/components/ui/button/Button";
import { Badge } from "@/components/ui/badge/Badge";
import { Card } from "@/components/ui/card/Card";
import { useFormat } from "@/lib/format";

const TH = "sticky top-0 whitespace-nowrap border-b border-line bg-surface-sunken px-3 py-2 text-left text-[12px] font-[650] uppercase tracking-[0.04em] text-ink-muted";
const TD = "border-b border-line px-2 py-2 align-middle";
const cell =
  "h-9 w-full min-w-[72px] rounded-[var(--radius-s)] border border-line-strong bg-surface-raised px-2 text-sm text-ink focus:outline-2 focus:outline-offset-2 focus:outline-focus-ring";

interface Row {
  id: string;
  title: string;
  category: string | null;
  price: string | null;
  currency: string | null;
  weightKg: string | null;
  lengthCm: string | null;
  widthCm: string | null;
  heightCm: string | null;
  weighable: boolean;
  provider: { name: string };
}

const FIELDS = ["category", "weightKg", "lengthCm", "widthCm", "heightCm"] as const;
type Draft = Record<(typeof FIELDS)[number], string>;
const draftOf = (r: Row): Draft => Object.fromEntries(FIELDS.map((k) => [k, r[k] ?? ""])) as Draft;
const COLUMN = { weightKg: "weight", lengthCm: "length", widthCm: "width", heightCm: "height" } as const;

/**
 * The shop's products with what pricing needs: category, packed weight and
 * size per unit. A product with neither its own weight nor its category's
 * (Tarifs → Poids par catégorie) shows "on request" in the shop.
 */
export function CatalogueSizes() {
  const t = useTranslations("products.catalogue");
  const f = useFormat();
  const [missing, setMissing] = useState(true);
  const [q, setQ] = useState("");
  const [result, setResult] = useState<{ key: string; items: Row[] } | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const key = `${missing}|${q}|${version}`;
  const rows = result?.key === key ? result.items : null;

  useEffect(() => {
    const params = new URLSearchParams({ ...(missing ? { missingWeight: "true" } : {}), ...(q ? { q } : {}) });
    api.get<{ items: Row[] }>(`/products?${params}`).then((page) => setResult({ key: `${missing}|${q}|${version}`, items: page.items }));
  }, [missing, q, version]);

  async function save(r: Row) {
    const d = drafts[r.id] ?? draftOf(r);
    const n = (v: string) => (v.trim() === "" ? null : Number(v));
    setBusy(r.id);
    setError(null);
    try {
      await api.patch(`/products/${r.id}`, { category: d.category.trim() || null, weightKg: n(d.weightKg), lengthCm: n(d.lengthCm), widthCm: n(d.widthCm), heightCm: n(d.heightCm) });
      setDrafts((all) => {
        const rest = { ...all };
        delete rest[r.id];
        return rest;
      });
      setVersion((v) => v + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("failed"));
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card padding={24} className="mt-10">
      <h2 className="rb-headline text-xl">{t("title")}</h2>
      <p className="mt-1 max-w-3xl text-sm text-ink-muted">{t("intro")}</p>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <input className={`${cell} max-w-xs`} placeholder={t("search")} defaultValue={q} onKeyDown={(e) => e.key === "Enter" && setQ(e.currentTarget.value.trim())} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={missing} onChange={(e) => setMissing(e.target.checked)} />
          {t("onlyMissing")}
        </label>
        {error && <p className="text-sm text-critical">{error}</p>}
      </div>

      {!rows ? (
        <p className="mt-4 text-sm text-ink-muted">{t("loading")}</p>
      ) : rows.length === 0 ? (
        <p className="mt-4 text-sm text-ink-muted">{missing ? t("allWeighable") : t("empty")}</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-[var(--radius-m)] border border-line">
          <table className="w-full min-w-[900px] border-separate border-spacing-0 text-sm">
            <thead>
              <tr>
                <th className={TH}>{t("col.product")}</th>
                <th className={TH}>{t("col.category")}</th>
                <th className={TH}>{t("col.weight")}</th>
                <th className={TH}>{t("col.length")}</th>
                <th className={TH}>{t("col.width")}</th>
                <th className={TH}>{t("col.height")}</th>
                <th className={TH}>
                  <span className="sr-only">{t("save")}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const d = drafts[r.id] ?? draftOf(r);
                const set = (k: (typeof FIELDS)[number]) => (e: React.ChangeEvent<HTMLInputElement>) => setDrafts({ ...drafts, [r.id]: { ...d, [k]: e.target.value } });
                return (
                  <tr key={r.id}>
                    <td className={`${TD} max-w-[320px]`}>
                      <span className="line-clamp-2 font-semibold">{r.title}</span>
                      <span className="block text-xs text-ink-muted">
                        {r.provider.name}
                        {r.price && ` · ${f.money(r.price, r.currency)}`}
                      </span>
                      {!r.weighable && <Badge variant="attn">{t("onRequest")}</Badge>}
                    </td>
                    <td className={TD}>
                      <input className={cell} value={d.category} onChange={set("category")} aria-label={t("col.category")} />
                    </td>
                    {(["weightKg", "lengthCm", "widthCm", "heightCm"] as const).map((k) => (
                      <td key={k} className={TD}>
                        <input className={cell} type="number" min="0" step="any" value={d[k]} onChange={set(k)} aria-label={t(`col.${COLUMN[k]}`)} />
                      </td>
                    ))}
                    <td className={`${TD} text-right`}>
                      <Button size="s" variant="secondary" loading={busy === r.id} disabled={!drafts[r.id]} onClick={() => save(r)}>
                        {t("save")}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
