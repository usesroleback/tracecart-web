"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { api } from "@/lib/apiClient";
import { Badge } from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { Field, FormActions, input } from "@/components/ui/form/Form";
import { AdminCategory, categoryOptions, pick } from "./types";

const TYPES = ["NUMBER", "ENUM", "BOOLEAN", "TEXT"] as const;

/** "value=Libellé|Label" lines → list options. */
function parseOptions(text: string) {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [value, labels = ""] = l.split("=");
      const [fr, en] = labels.split("|");
      return { value: value.trim(), label: { fr: (fr || value).trim(), en: (en || fr || value).trim() } };
    });
}

/** The category tree with each category's attributes; add, rename, switch off. */
export function CategoriesAdmin({ canWrite }: { canWrite: boolean }) {
  const t = useTranslations("catalogAdmin.categories");
  const locale = useLocale();
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setCategories((await api.get<{ categories: AdminCategory[] }>("/admin/catalog/categories")).categories);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const run = async (fn: () => Promise<unknown>) => {
    setError(null);
    try {
      await fn();
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const options = categoryOptions(categories, locale);
  const byId = new Map(categories.map((c) => [c.id, c]));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="rb-headline text-[28px]">{t("title")}</h1>
        <p className="mt-1 max-w-3xl text-sm text-ink-muted">{t("lead")}</p>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-critical">
          {error}
        </p>
      ) : null}
      {canWrite ? <AddCategory options={options} onAdd={(body) => run(() => api.post("/admin/catalog/categories", body))} /> : null}
      <ul className="divide-y divide-line rounded-[var(--radius-m)] border border-line bg-surface-raised">
        {options.map((o) => {
          const c = byId.get(o.id)!;
          const depth = o.label.split(" › ").length - 1;
          return (
            <li key={c.id} className="px-4 py-3" style={{ paddingLeft: `${16 + depth * 20}px` }}>
              <div className="flex flex-wrap items-center gap-3">
                <button type="button" className="text-left font-medium text-ink hover:underline" aria-expanded={open === c.id} onClick={() => setOpen(open === c.id ? null : c.id)}>
                  {pick(c.name, locale)}
                </button>
                <span className="rb-mono-s text-ink-muted">{c.slug}</span>
                <span className="text-xs text-ink-muted">{t("products", { count: c.productCount })}</span>
                {c.attributes.length ? <span className="text-xs text-ink-muted">· {c.attributes.map((a) => a.key).join(", ")}</span> : null}
                {!c.active ? <Badge variant="critical">{t("inactive")}</Badge> : null}
                {canWrite ? (
                  <Button variant="ghost" size="s" className="ml-auto" onClick={() => run(() => api.patch(`/admin/catalog/categories/${c.id}`, { active: !c.active }))}>
                    {c.active ? t("switchOff") : t("switchOn")}
                  </Button>
                ) : null}
              </div>
              {open === c.id ? (
                <div className="mt-3 rounded-[var(--radius-s)] bg-surface-sunken p-3">
                  {canWrite ? <CategoryText category={c} onSave={(body) => run(() => api.patch(`/admin/catalog/categories/${c.id}`, body))} /> : null}
                  <ul className="mb-3 divide-y divide-line text-sm">
                    {c.attributes.map((a) => (
                      <li key={a.id} className="flex flex-wrap items-center gap-3 py-2">
                        <span className="rb-mono">{a.key}</span>
                        <span>{pick(a.label, locale)}</span>
                        <span className="text-ink-muted">
                          {t(`types.${a.type}`)}
                          {a.unit ? ` (${a.unit})` : ""}
                        </span>
                        {a.filterable ? <Badge variant="info">{t("filterable")}</Badge> : null}
                        {a.searchable ? <Badge variant="outline">{t("searchable")}</Badge> : null}
                        {a.required ? <Badge variant="attn">{t("required")}</Badge> : null}
                        {canWrite ? (
                          <Button
                            variant="ghost"
                            size="s"
                            className="ml-auto"
                            onClick={() => window.confirm(t("confirmDelete", { key: a.key })) && run(() => api.delete(`/admin/catalog/attributes/${a.id}`))}
                          >
                            {t("delete")}
                          </Button>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                  {canWrite ? <AddAttribute onAdd={(body) => run(() => api.post(`/admin/catalog/categories/${c.id}/attributes`, body))} /> : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** The names and the description shown at the top of the category's page in the store, in both languages. */
function CategoryText({ category, onSave }: { category: AdminCategory; onSave: (body: unknown) => Promise<void> }) {
  const t = useTranslations("catalogAdmin.categories");
  const [f, setF] = useState({
    fr: category.name?.fr ?? "",
    en: category.name?.en ?? "",
    descFr: category.description?.fr ?? "",
    descEn: category.description?.en ?? "",
    fitmentKind: category.fitmentKind ?? "",
  });
  const [saved, setSaved] = useState(false);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => (setSaved(false), setF((x) => ({ ...x, [k]: e.target.value })));
  const both = (fr: string, en: string) => ({ ...(fr.trim() ? { fr: fr.trim() } : {}), ...(en.trim() ? { en: en.trim() } : {}) });
  async function submit(e: FormEvent) {
    e.preventDefault();
    const description = both(f.descFr, f.descEn);
    await onSave({ name: both(f.fr, f.en), description: Object.keys(description).length ? description : null, fitmentKind: f.fitmentKind || null });
    setSaved(true);
  }
  return (
    <form onSubmit={submit} aria-label={t("textTitle")} className="mb-4 grid gap-3 border-b border-line pb-4 sm:grid-cols-2">
      <Field label={t("nameFr")}>
        <input className={input} value={f.fr} onChange={set("fr")} required maxLength={120} />
      </Field>
      <Field label={t("nameEn")}>
        <input className={input} value={f.en} onChange={set("en")} maxLength={120} />
      </Field>
      <Field label={t("descriptionFr")} hint={t("descriptionHint")}>
        <textarea className={input} rows={3} value={f.descFr} onChange={set("descFr")} maxLength={2000} />
      </Field>
      <Field label={t("descriptionEn")}>
        <textarea className={input} rows={3} value={f.descEn} onChange={set("descEn")} maxLength={2000} />
      </Field>
      <Field label={t("fitmentKind")} hint={t("fitmentKindHint")}>
        <select className={input} value={f.fitmentKind} onChange={set("fitmentKind")}>
          <option value="">{t("fitmentNone")}</option>
          {(["VEHICLE", "DEVICE", "APPLIANCE"] as const).map((k) => (
            <option key={k} value={k}>
              {t(`fitmentKinds.${k}`)}
            </option>
          ))}
        </select>
      </Field>
      <div className="flex items-center gap-3 sm:col-span-2">
        <Button type="submit" variant="primary" size="s">
          {t("saveText")}
        </Button>
        {saved ? (
          <span role="status" className="text-sm text-ink-muted">
            {t("textSaved")}
          </span>
        ) : null}
      </div>
    </form>
  );
}

function AddCategory({ options, onAdd }: { options: { id: string; label: string }[]; onAdd: (body: unknown) => Promise<void> }) {
  const t = useTranslations("catalogAdmin.categories");
  const [f, setF] = useState({ slug: "", fr: "", en: "", parentId: "" });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }));
  async function submit(e: FormEvent) {
    e.preventDefault();
    await onAdd({ slug: f.slug, parentId: f.parentId || null, name: { ...(f.fr ? { fr: f.fr } : {}), ...(f.en ? { en: f.en } : {}) } });
    setF({ slug: "", fr: "", en: "", parentId: f.parentId });
  }
  return (
    <form onSubmit={submit} className="grid gap-3 rounded-[var(--radius-m)] border border-line bg-surface-raised p-4 sm:grid-cols-2 lg:grid-cols-5">
      <Field label={t("nameFr")}>
        <input className={input} value={f.fr} onChange={set("fr")} />
      </Field>
      <Field label={t("nameEn")}>
        <input className={input} value={f.en} onChange={set("en")} />
      </Field>
      <Field label={t("slug")}>
        <input className={input} value={f.slug} onChange={set("slug")} required pattern="[a-z0-9]+(-[a-z0-9]+)*" />
      </Field>
      <Field label={t("parent")}>
        <select className={input} value={f.parentId} onChange={set("parentId")}>
          <option value="">{t("top")}</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </Field>
      <div className="flex items-end">
        <Button type="submit" variant="primary">
          {t("add")}
        </Button>
      </div>
    </form>
  );
}

function AddAttribute({ onAdd }: { onAdd: (body: unknown) => Promise<void> }) {
  const t = useTranslations("catalogAdmin.categories");
  const [f, setF] = useState({ key: "", fr: "", en: "", type: "NUMBER" as (typeof TYPES)[number], unit: "", options: "", filterable: true, searchable: true, required: false });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }));
  const flag = (k: "filterable" | "searchable" | "required") => (e: { target: { checked: boolean } }) => setF((x) => ({ ...x, [k]: e.target.checked }));
  async function submit(e: FormEvent) {
    e.preventDefault();
    await onAdd({
      key: f.key,
      label: { ...(f.fr ? { fr: f.fr } : {}), ...(f.en ? { en: f.en } : {}) },
      type: f.type,
      unit: f.type === "NUMBER" && f.unit ? f.unit : null,
      options: f.type === "ENUM" ? parseOptions(f.options) : null,
      filterable: f.filterable,
      searchable: f.searchable,
      required: f.required,
    });
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Field label={t("key")}>
          <input className={input} value={f.key} onChange={set("key")} required pattern="[a-z][a-z0-9_]*" />
        </Field>
        <Field label={t("labelFr")}>
          <input className={input} value={f.fr} onChange={set("fr")} />
        </Field>
        <Field label={t("labelEn")}>
          <input className={input} value={f.en} onChange={set("en")} />
        </Field>
        <Field label={t("type")}>
          <select className={input} value={f.type} onChange={set("type")}>
            {TYPES.map((x) => (
              <option key={x} value={x}>
                {t(`types.${x}`)}
              </option>
            ))}
          </select>
        </Field>
        {f.type === "NUMBER" ? (
          <Field label={t("unit")}>
            <input className={input} value={f.unit} onChange={set("unit")} maxLength={12} />
          </Field>
        ) : null}
      </div>
      {f.type === "ENUM" ? (
        <Field label={t("optionsHint")}>
          <textarea className={`${input} h-auto min-h-[5rem] py-2`} value={f.options} onChange={set("options")} required />
        </Field>
      ) : null}
      <div className="flex flex-wrap gap-4 text-sm">
        {(["filterable", "searchable", "required"] as const).map((k) => (
          <label key={k} className="flex items-center gap-2">
            <input type="checkbox" checked={f[k]} onChange={flag(k)} /> {t(k)}
          </label>
        ))}
      </div>
      <FormActions>
        <Button type="submit" variant="secondary" size="m">
          {t("addAttribute")}
        </Button>
      </FormActions>
    </form>
  );
}
