"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { api } from "@/lib/apiClient";
import Button from "@/components/ui/button/Button";
import { Field, input } from "@/components/ui/form/Form";

interface Brand {
  id: string;
  slug: string;
  name: string;
  website: string | null;
  productCount: number;
}

export function BrandsAdmin({ canWrite }: { canWrite: boolean }) {
  const t = useTranslations("catalogAdmin.brands");
  const [brands, setBrands] = useState<Brand[]>([]);
  const [f, setF] = useState({ name: "", slug: "", website: "" });
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setBrands((await api.get<{ brands: Brand[] }>("/admin/catalog/brands")).brands);
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
      await api.post("/admin/catalog/brands", { name: f.name, slug: f.slug, website: f.website || null });
      setF({ name: "", slug: "", website: "" });
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="rb-headline text-[28px]">{t("title")}</h1>
      {canWrite ? (
        <form onSubmit={add} className="grid gap-3 rounded-[var(--radius-m)] border border-line bg-surface-raised p-4 sm:grid-cols-4">
          <Field label={t("name")}>
            <input className={input} value={f.name} onChange={(e) => setF((x) => ({ ...x, name: e.target.value }))} required maxLength={80} />
          </Field>
          <Field label={t("slug")}>
            <input className={input} value={f.slug} onChange={(e) => setF((x) => ({ ...x, slug: e.target.value }))} required pattern="[a-z0-9]+(-[a-z0-9]+)*" />
          </Field>
          <Field label={t("website")}>
            <input className={input} type="url" value={f.website} onChange={(e) => setF((x) => ({ ...x, website: e.target.value }))} />
          </Field>
          <div className="flex items-end">
            <Button type="submit" variant="primary">
              {t("add")}
            </Button>
          </div>
        </form>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-critical">
          {error}
        </p>
      ) : null}
      <ul className="divide-y divide-line rounded-[var(--radius-m)] border border-line bg-surface-raised">
        {brands.map((b) => (
          <li key={b.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
            <span className="font-medium">{b.name}</span>
            <span className="rb-mono-s text-ink-muted">{b.slug}</span>
            {b.website ? (
              <a href={b.website} className="text-ink-muted underline" target="_blank" rel="noopener">
                {b.website}
              </a>
            ) : null}
            <span className="ml-auto text-ink-muted">{t("products", { count: b.productCount })}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
