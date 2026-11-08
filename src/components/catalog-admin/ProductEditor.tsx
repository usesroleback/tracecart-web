"use client";

import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { api } from "@/lib/apiClient";
import { currencyExponent, toMajor, toMinor } from "@/lib/currency";
import { Badge } from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { Field, FormActions, FormSection, input } from "@/components/ui/form/Form";
import {
  AdminCategory,
  AdminOffer,
  AdminProduct,
  AdminVariant,
  categoryOptions,
  definitionsFor,
  FULFILLMENT_TYPES,
  FulfillmentType,
  FIT_EVIDENCE,
  FITMENT_KINDS,
  LINK_KINDS,
  VERIFYING,
  type AdminFitment,
  type FitEvidence,
  OFFER_STATUSES,
  parsePairs,
  pick,
  PRODUCT_STATUSES,
  References,
  STATUS_BADGE,
  type AttributeDefinition,
} from "./types";

const textarea = `${input} h-auto min-h-[5rem] py-2`;

function Panel({ title, children, hint }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="rounded-[var(--radius-m)] border border-line bg-surface-raised p-5">
      <h2 className="rb-title mb-1">{title}</h2>
      {hint ? <p className="mb-4 text-sm text-ink-muted">{hint}</p> : <div className="mb-3" />}
      {children}
    </section>
  );
}

/** A value from a form field to what the attribute's type stores. */
function attributeValue(def: AttributeDefinition, raw: string): unknown {
  if (raw === "") return undefined;
  if (def.type === "NUMBER") return Number(raw.replace(",", "."));
  if (def.type === "BOOLEAN") return raw === "true";
  return raw;
}

const asField = (v: unknown) => (v === undefined || v === null ? "" : Array.isArray(v) ? v.join(", ") : String(v));

/**
 * One product in the back office: its details and attributes, its versions
 * with their offers and stock, photos and documents, and compatibility links.
 * Without a product id, the form creates one.
 */
export function ProductEditor({ productId, canWrite, canWriteOffers }: { productId?: string; canWrite: boolean; canWriteOffers: boolean }) {
  const t = useTranslations("catalogAdmin");
  const locale = useLocale();
  const router = useRouter();
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [refs, setRefs] = useState<References | null>(null);
  const [product, setProduct] = useState<AdminProduct | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!productId) return;
    try {
      setProduct(await api.get<AdminProduct>(`/admin/catalog/products/${productId}`));
    } catch (e) {
      setLoadError((e as Error).message);
    }
  }, [productId]);

  useEffect(() => {
    Promise.all([api.get<{ categories: AdminCategory[] }>("/admin/catalog/categories"), api.get<References>("/admin/catalog/references")])
      .then(([c, r]) => {
        setCategories(c.categories);
        setRefs(r);
      })
      .catch((e) => setLoadError((e as Error).message));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
  }, [reload]);

  if (loadError) return <p role="alert" className="text-critical">{loadError}</p>;
  if (!refs || (productId && !product)) return <p className="text-ink-muted">…</p>;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/catalog" className="text-sm text-ink-muted hover:text-ink">
          ← {t("editor.back")}
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="rb-headline text-[28px]">{product ? pick(product.title, locale) : t("editor.newTitle")}</h1>
          {product ? <Badge variant={STATUS_BADGE[product.status]}>{t(`status.${product.status}`)}</Badge> : null}
          {product?.status === "ACTIVE" ? (
            <a href={`/${locale}/p/${product.slug}`} target="_blank" rel="noopener" className="text-sm text-ink underline">
              {t("editor.viewInStore")}
            </a>
          ) : null}
        </div>
      </div>
      <DetailsForm
        key={product?.updatedAt ?? "new"}
        product={product}
        categories={categories}
        refs={refs}
        canWrite={canWrite}
        onSaved={(id) => (product ? reload() : router.replace(`/catalog/products/${id}`))}
      />
      {product ? (
        <>
          <Panel title={t("editor.variants")}>
            <div className="flex flex-col gap-6">
              {product.variants.map((v) => (
                <VariantBlock key={v.id} variant={v} refs={refs} canWriteOffers={canWriteOffers} onChange={reload} />
              ))}
              {canWrite ? <AddVariant productId={product.id} onAdded={reload} /> : null}
            </div>
          </Panel>
          <MediaPanel product={product} canWrite={canWrite} onChange={reload} />
          <CompatibilityPanel product={product} canWrite={canWrite} onChange={reload} />
          <FitmentPanel product={product} canWrite={canWrite} onChange={reload} />
        </>
      ) : null}
    </div>
  );
}

function DetailsForm({
  product,
  categories,
  refs,
  canWrite,
  onSaved,
}: {
  product: AdminProduct | null;
  categories: AdminCategory[];
  refs: References;
  canWrite: boolean;
  onSaved: (id: string) => void;
}) {
  const t = useTranslations("catalogAdmin");
  const locale = useLocale();
  const [form, setForm] = useState({
    titleFr: product?.title?.fr ?? "",
    titleEn: product?.title?.en ?? "",
    descFr: product?.description?.fr ?? "",
    descEn: product?.description?.en ?? "",
    slug: product?.slug ?? "",
    categoryId: product?.categoryId ?? "",
    brandId: product?.brandId ?? "",
    status: product?.status ?? "DRAFT",
    warranty: product?.warrantyMonths?.toString() ?? "",
    firstSku: "",
  });
  const [attrs, setAttrs] = useState<Record<string, string>>(() => Object.fromEntries(Object.entries(product?.attributes ?? {}).map(([k, v]) => [k, asField(v)])));
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const definitions = useMemo(() => (form.categoryId ? definitionsFor(categories, form.categoryId) : []), [categories, form.categoryId]);
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    const attributes: Record<string, unknown> = {};
    for (const d of definitions) {
      const v = attributeValue(d, attrs[d.key] ?? "");
      if (v !== undefined) attributes[d.key] = v;
    }
    const lang = (fr: string, en: string) => (fr || en ? { ...(fr ? { fr } : {}), ...(en ? { en } : {}) } : null);
    const body = {
      title: lang(form.titleFr, form.titleEn),
      description: lang(form.descFr, form.descEn),
      categoryId: form.categoryId,
      brandId: form.brandId || null,
      status: form.status,
      warrantyMonths: form.warranty ? Number(form.warranty) : null,
      attributes,
      ...(form.slug ? { slug: form.slug } : {}),
    };
    try {
      if (product) {
        await api.patch(`/admin/catalog/products/${product.id}`, body);
        setSaved(true);
        onSaved(product.id);
      } else {
        const created = await api.post<{ id: string }>("/admin/catalog/products", { ...body, variants: [{ sku: form.firstSku }] });
        onSaved(created.id);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-5 rounded-[var(--radius-m)] border border-line bg-surface-raised p-5">
      <fieldset disabled={!canWrite} className="flex flex-col gap-5">
        <FormSection title={t("editor.details")} columns={2}>
          <Field label={t("editor.titleFr")}>
            <input className={input} value={form.titleFr} onChange={set("titleFr")} maxLength={200} />
          </Field>
          <Field label={t("editor.titleEn")}>
            <input className={input} value={form.titleEn} onChange={set("titleEn")} maxLength={200} />
          </Field>
          <Field label={t("editor.descriptionFr")}>
            <textarea className={textarea} value={form.descFr} onChange={set("descFr")} maxLength={5000} />
          </Field>
          <Field label={t("editor.descriptionEn")}>
            <textarea className={textarea} value={form.descEn} onChange={set("descEn")} maxLength={5000} />
          </Field>
          <Field label={t("editor.category")}>
            <select className={input} value={form.categoryId} onChange={set("categoryId")} required>
              <option value="" />
              {categoryOptions(refs.categories, locale).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("editor.brand")}>
            <select className={input} value={form.brandId} onChange={set("brandId")}>
              <option value="">{t("editor.noBrand")}</option>
              {refs.brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("editor.status")}>
            <select className={input} value={form.status} onChange={set("status")}>
              {PRODUCT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(`status.${s}`)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("editor.warranty")}>
            <input className={input} type="number" min={0} max={240} value={form.warranty} onChange={set("warranty")} />
          </Field>
          <Field label={t("editor.slug")} hint={t("editor.slugHint")}>
            <input className={input} value={form.slug} onChange={set("slug")} pattern="[a-z0-9]+(-[a-z0-9]+)*" />
          </Field>
          {!product ? (
            <Field label={t("editor.firstSku")}>
              <input className={input} value={form.firstSku} onChange={set("firstSku")} required pattern="[A-Za-z0-9][A-Za-z0-9._\-]*" maxLength={64} />
            </Field>
          ) : null}
        </FormSection>
        {definitions.length ? (
          <FormSection title={t("editor.attributes")} columns={3}>
            {definitions.map((d) => {
              const label = `${pick(d.label, locale) || d.key}${d.unit ? ` (${d.unit})` : ""}`;
              const value = attrs[d.key] ?? "";
              const change = (v: string) => setAttrs((a) => ({ ...a, [d.key]: v }));
              return (
                <Field key={d.key} label={label} required={d.required}>
                  {d.type === "ENUM" ? (
                    <select className={input} value={value} onChange={(e) => change(e.target.value)}>
                      <option value="">{t("editor.unset")}</option>
                      {(d.options ?? []).map((o) => (
                        <option key={o.value} value={o.value}>
                          {pick(o.label, locale)}
                        </option>
                      ))}
                    </select>
                  ) : d.type === "BOOLEAN" ? (
                    <select className={input} value={value} onChange={(e) => change(e.target.value)}>
                      <option value="">{t("editor.unset")}</option>
                      <option value="true">{t("editor.yes")}</option>
                      <option value="false">{t("editor.no")}</option>
                    </select>
                  ) : (
                    <input className={input} type={d.type === "NUMBER" ? "number" : "text"} step="any" value={value} onChange={(e) => change(e.target.value)} />
                  )}
                </Field>
              );
            })}
          </FormSection>
        ) : null}
      </fieldset>
      {canWrite ? (
        <FormActions error={error} saved={saved}>
          <Button type="submit" variant="primary" loading={saving}>
            {product ? t("editor.save") : t("editor.create")}
          </Button>
        </FormActions>
      ) : null}
    </form>
  );
}

function VariantBlock({ variant, refs, canWriteOffers, onChange }: { variant: AdminVariant; refs: References; canWriteOffers: boolean; onChange: () => void }) {
  const t = useTranslations("catalogAdmin");
  const options = Object.entries(variant.options ?? {})
    .map(([k, v]) => `${k}: ${v}`)
    .join(" · ");
  return (
    <div className="border-t border-line pt-5 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-baseline gap-3">
        <h3 className="rb-mono font-medium">{variant.sku}</h3>
        {options ? <span className="text-sm text-ink-muted">{options}</span> : null}
        {!variant.active ? <Badge variant="critical">{t("status.ARCHIVED")}</Badge> : null}
      </div>
      {variant.stock.length ? (
        <p className="mt-1 text-xs text-ink-muted">
          {t("editor.stock")}: {variant.stock.map((s) => t("editor.stockLine", { warehouse: s.warehouse.code, onHand: s.onHand, reserved: s.reserved })).join(" · ")}
        </p>
      ) : null}
      <div className="mt-3 flex flex-col gap-2">
        {variant.offers.length === 0 ? <p className="text-sm text-ink-muted">{t("editor.noOffers")}</p> : null}
        {variant.offers.map((o) => (
          <OfferRow key={o.id} offer={o} canWrite={canWriteOffers} onSaved={onChange} />
        ))}
      </div>
      {canWriteOffers ? <AddOffer variantId={variant.id} refs={refs} onAdded={onChange} /> : null}
    </div>
  );
}

function OfferRow({ offer, canWrite, onSaved }: { offer: AdminOffer; canWrite: boolean; onSaved: () => void }) {
  const t = useTranslations("catalogAdmin");
  const major = (m: number | null) => (m === null ? "" : String(toMajor(m, offer.currency)));
  const [price, setPrice] = useState(major(offer.priceMinor));
  const [compareAt, setCompareAt] = useState(major(offer.compareAtMinor));
  const [status, setStatus] = useState(offer.status);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const step = currencyExponent(offer.currency) > 0 ? "0.01" : "1";
  const where = offer.warehouse ? `${offer.warehouse.code} (${offer.warehouse.city})` : null;

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.patch(`/admin/catalog/offers/${offer.id}`, { priceMinor: toMinor(price, offer.currency), compareAtMinor: toMinor(compareAt, offer.currency), status });
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="rounded-[var(--radius-s)] border border-line p-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Badge variant="outline">{t(`fulfillment.${offer.fulfillmentType}`)}</Badge>
        {offer.seller ? <span>{offer.seller.name}</span> : null}
        {where ? <span className="text-ink-muted">{where}</span> : null}
        {offer.fulfillmentType === "CROSS_BORDER" ? (
          <span className="text-ink-muted">
            {offer.sourceSupplier?.name ?? ""}
            {offer.sourcePriceMinor !== null && offer.sourceCurrency ? ` · ${t("editor.sourcePrice")}: ${toMajor(offer.sourcePriceMinor, offer.sourceCurrency)} ${offer.sourceCurrency}` : ""}
            {offer.leadTimeDaysMin !== null ? ` · ${t("editor.leadDays", { min: offer.leadTimeDaysMin, max: offer.leadTimeDaysMax ?? offer.leadTimeDaysMin })}` : ""}
          </span>
        ) : null}
      </div>
      <fieldset disabled={!canWrite} className="mt-3 flex flex-wrap items-end gap-2">
        <Field label={`${t("editor.price")} (${offer.currency})`} className="w-36">
          <input className={input} type="number" min={0} step={step} value={price} onChange={(e) => setPrice(e.target.value)} />
        </Field>
        <Field label={t("editor.compareAt")} className="w-36">
          <input className={input} type="number" min={0} step={step} value={compareAt} onChange={(e) => setCompareAt(e.target.value)} />
        </Field>
        <Field label={t("editor.status")} className="w-40">
          <select className={input} value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
            {OFFER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`status.${s}`)}
              </option>
            ))}
          </select>
        </Field>
        {canWrite ? (
          <Button type="submit" variant="secondary" size="m" loading={busy}>
            {t("editor.save")}
          </Button>
        ) : null}
      </fieldset>
      {error ? (
        <p role="alert" className="mt-2 text-sm text-critical">
          {error}
        </p>
      ) : null}
    </form>
  );
}

function AddOffer({ variantId, refs, onAdded }: { variantId: string; refs: References; onAdded: () => void }) {
  const t = useTranslations("catalogAdmin");
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({
    fulfillmentType: "TRACECART_STOCK" as FulfillmentType,
    status: "DRAFT",
    price: "",
    currency: "XOF",
    compareAt: "",
    warehouseId: "",
    sellerId: "",
    supplierId: "",
    sourcePrice: "",
    sourceCurrency: "",
    sourceUrl: "",
    leadMin: "",
    leadMax: "",
    handling: "1",
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }));
  const kind = f.fulfillmentType;
  const warehouses = refs.warehouses.filter((w) => (kind === "SELLER_FULFILLED" ? w.type === "SELLER" && (!f.sellerId || w.organizationId === f.sellerId) : ["TRACECART", "PARTNER"].includes(w.type)));
  const num = (v: string) => (v === "" ? null : Number(v));

  async function add(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.post(`/admin/catalog/variants/${variantId}/offers`, {
        fulfillmentType: kind,
        status: f.status,
        currency: f.currency,
        priceMinor: toMinor(f.price, f.currency),
        compareAtMinor: toMinor(f.compareAt, f.currency),
        handlingDays: Number(f.handling || 1),
        ...(kind !== "CROSS_BORDER" ? { warehouseId: f.warehouseId || null } : {}),
        ...(kind === "SELLER_FULFILLED" || kind === "FULFILLED_BY_TRACECART" ? { sellerId: f.sellerId || null } : {}),
        ...(kind === "CROSS_BORDER"
          ? {
              sourceSupplierId: f.supplierId || null,
              sourceCurrency: f.sourceCurrency || null,
              sourcePriceMinor: f.sourceCurrency ? toMinor(f.sourcePrice, f.sourceCurrency) : null,
              sourceUrl: f.sourceUrl || null,
              leadTimeDaysMin: num(f.leadMin),
              leadTimeDaysMax: num(f.leadMax),
            }
          : {}),
      });
      setOpen(false);
      onAdded();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!open)
    return (
      <div className="mt-3">
        <Button variant="ghost" size="s" onClick={() => setOpen(true)}>
          + {t("editor.addOffer")}
        </Button>
      </div>
    );
  return (
    <form onSubmit={add} className="mt-3 flex flex-col gap-3 rounded-[var(--radius-s)] border border-dashed border-line-strong p-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label={t("editor.kind")}>
          <select className={input} value={kind} onChange={set("fulfillmentType")}>
            {FULFILLMENT_TYPES.map((k) => (
              <option key={k} value={k}>
                {t(`fulfillment.${k}`)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("editor.status")}>
          <select className={input} value={f.status} onChange={set("status")}>
            {OFFER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`status.${s}`)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("editor.price")}>
          <input className={input} type="number" min={0} step="any" value={f.price} onChange={set("price")} />
        </Field>
        <Field label={t("editor.currency")}>
          <input className={input} value={f.currency} onChange={set("currency")} pattern="[A-Za-z]{3}" required />
        </Field>
        {kind === "SELLER_FULFILLED" || kind === "FULFILLED_BY_TRACECART" ? (
          <Field label={t("editor.seller")}>
            <select className={input} value={f.sellerId} onChange={set("sellerId")} required>
              <option value="" />
              {refs.sellers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
        ) : null}
        {kind !== "CROSS_BORDER" ? (
          <Field label={t("editor.warehouse")}>
            <select className={input} value={f.warehouseId} onChange={set("warehouseId")} required>
              <option value="" />
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.code} · {w.city}
                </option>
              ))}
            </select>
          </Field>
        ) : (
          <>
            <Field label={t("editor.supplier")}>
              <select className={input} value={f.supplierId} onChange={set("supplierId")}>
                <option value="" />
                {refs.suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t("editor.sourcePrice")}>
              <input className={input} type="number" min={0} step="any" value={f.sourcePrice} onChange={set("sourcePrice")} />
            </Field>
            <Field label={t("editor.sourceCurrency")}>
              <input className={input} value={f.sourceCurrency} onChange={set("sourceCurrency")} pattern="[A-Za-z]{3}" />
            </Field>
            <Field label={t("editor.sourceUrl")}>
              <input className={input} type="url" value={f.sourceUrl} onChange={set("sourceUrl")} />
            </Field>
            <Field label={t("editor.leadMin")}>
              <input className={input} type="number" min={0} value={f.leadMin} onChange={set("leadMin")} />
            </Field>
            <Field label={t("editor.leadMax")}>
              <input className={input} type="number" min={0} value={f.leadMax} onChange={set("leadMax")} />
            </Field>
          </>
        )}
        <Field label={t("editor.handling")}>
          <input className={input} type="number" min={0} max={60} value={f.handling} onChange={set("handling")} />
        </Field>
      </div>
      <FormActions error={error}>
        <Button type="submit" variant="primary" size="m" loading={busy}>
          {t("editor.addOffer")}
        </Button>
        <Button variant="ghost" size="m" onClick={() => setOpen(false)}>
          ×
        </Button>
      </FormActions>
    </form>
  );
}

function AddVariant({ productId, onAdded }: { productId: string; onAdded: () => void }) {
  const t = useTranslations("catalogAdmin");
  const [sku, setSku] = useState("");
  const [options, setOptions] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function add(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.post(`/admin/catalog/products/${productId}/variants`, { sku, options: parsePairs(options) });
      setSku("");
      setOptions("");
      onAdded();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={add} className="flex flex-col gap-3 border-t border-line pt-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t("editor.sku")}>
          <input className={input} value={sku} onChange={(e) => setSku(e.target.value)} required pattern="[A-Za-z0-9][A-Za-z0-9._\-]*" maxLength={64} />
        </Field>
        <Field label={t("editor.options")} hint={t("editor.optionsHint")}>
          <textarea className={textarea} value={options} onChange={(e) => setOptions(e.target.value)} />
        </Field>
      </div>
      <FormActions error={error}>
        <Button type="submit" variant="secondary" size="m" loading={busy}>
          {t("editor.addVariant")}
        </Button>
      </FormActions>
    </form>
  );
}

function MediaPanel({ product, canWrite, onChange }: { product: AdminProduct; canWrite: boolean; onChange: () => void }) {
  const t = useTranslations("catalogAdmin");
  const [url, setUrl] = useState("");
  const [kind, setKind] = useState("IMAGE");
  const [error, setError] = useState<string | null>(null);

  async function add(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post(`/admin/catalog/products/${product.id}/media`, { kind, url, ...(kind === "DOCUMENT" ? { role: "manual" } : {}) });
      setUrl("");
      onChange();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function remove(id: string) {
    try {
      await api.delete(`/admin/catalog/media/${id}`);
      onChange();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <Panel title={t("editor.media")}>
      <ul className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {product.media.map((m) => (
          <li key={m.id} className="flex flex-col gap-2 rounded-[var(--radius-s)] border border-line p-2 text-sm">
            {m.kind === "IMAGE" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={m.url} alt="" className="aspect-square w-full rounded-[var(--radius-xs)] bg-surface-sunken object-contain" />
            ) : (
              <a href={m.url} className="break-all text-ink underline" target="_blank" rel="noopener">
                {t(`editor.kinds.${m.kind as "IMAGE"}`)}
              </a>
            )}
            {canWrite ? (
              <Button variant="ghost" size="s" onClick={() => remove(m.id)}>
                {t("editor.remove")}
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
      {canWrite ? (
        <form onSubmit={add} className="flex flex-wrap items-end gap-2">
          <Field label={t("editor.mediaUrl")} className="min-w-[16rem] flex-1">
            <input className={input} type="url" value={url} onChange={(e) => setUrl(e.target.value)} required pattern="https://.*" />
          </Field>
          <Field label={t("editor.mediaKind")} className="w-40">
            <select className={input} value={kind} onChange={(e) => setKind(e.target.value)}>
              {["IMAGE", "VIDEO", "DOCUMENT"].map((k) => (
                <option key={k} value={k}>
                  {t(`editor.kinds.${k as "IMAGE"}`)}
                </option>
              ))}
            </select>
          </Field>
          <Button type="submit" variant="secondary" size="m">
            {t("editor.addMedia")}
          </Button>
        </form>
      ) : null}
      {error ? (
        <p role="alert" className="mt-2 text-sm text-critical">
          {error}
        </p>
      ) : null}
    </Panel>
  );
}

function CompatibilityPanel({ product, canWrite, onChange }: { product: AdminProduct; canWrite: boolean; onChange: () => void }) {
  const t = useTranslations("catalogAdmin");
  const locale = useLocale();
  const [fromSku, setFromSku] = useState(product.variants[0]?.sku ?? "");
  const [kind, setKind] = useState<(typeof LINK_KINDS)[number]>("FITS");
  const [toSku, setToSku] = useState("");
  const [evidence, setEvidence] = useState<FitEvidence>("UNVERIFIED");
  const [evidenceRef, setEvidenceRef] = useState("");
  const [error, setError] = useState<string | null>(null);
  const links = product.variants.flatMap((v) => v.compatibleTo.map((c) => ({ ...c, fromSku: v.sku })));

  async function add(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post("/admin/catalog/compatibility", { fromSku, toSku, kind, evidence, evidenceRef: evidenceRef.trim() || null });
      setToSku("");
      setEvidenceRef("");
      onChange();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function remove(id: string) {
    try {
      await api.delete(`/admin/catalog/compatibility/${id}`);
      onChange();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <Panel title={t("editor.compatibility")} hint={t("editor.compatibilityHint")}>
      {links.length ? (
        <ul className="mb-4 divide-y divide-line text-sm">
          {links.slice(0, 50).map((l) => (
            <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span>
                <span className="rb-mono">{l.fromSku}</span> {t(`editor.links.${l.kind as "FITS"}`)} <span className="rb-mono">{l.to.sku}</span>{" "}
                <span className="text-ink-muted">({pick(l.to.product.title, locale)})</span>{" "}
                <EvidenceBadge evidence={l.evidence} evidenceRef={l.evidenceRef} />
              </span>
              {canWrite ? (
                <Button variant="ghost" size="s" onClick={() => remove(l.id)}>
                  {t("editor.remove")}
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {canWrite ? (
        <form onSubmit={add} className="flex flex-wrap items-end gap-2">
          <Field label={t("editor.fromSku")} className="w-48">
            <select className={input} value={fromSku} onChange={(e) => setFromSku(e.target.value)}>
              {product.variants.map((v) => (
                <option key={v.id} value={v.sku}>
                  {v.sku}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("editor.kind")} className="w-52">
            <select className={input} value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
              {LINK_KINDS.map((k) => (
                <option key={k} value={k}>
                  {t(`editor.links.${k}`)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("editor.toSku")} className="w-48">
            <input className={input} value={toSku} onChange={(e) => setToSku(e.target.value)} required />
          </Field>
          <EvidenceFields evidence={evidence} evidenceRef={evidenceRef} onEvidence={setEvidence} onRef={setEvidenceRef} />
          <Button type="submit" variant="secondary" size="m">
            {t("editor.addMedia")}
          </Button>
        </form>
      ) : null}
      {error ? (
        <p role="alert" className="mt-2 text-sm text-critical">
          {error}
        </p>
      ) : null}
    </Panel>
  );
}

/** What a claim rests on, as staff read it: verified (green) or only possible. */
function EvidenceBadge({ evidence, evidenceRef }: { evidence: FitEvidence; evidenceRef: string | null }) {
  const t = useTranslations("catalogAdmin.editor");
  return (
    <Badge variant={VERIFYING.includes(evidence) ? "positive" : "outline"}>
      {t(`evidence.${evidence}`)}
      {evidenceRef ? ` · ${evidenceRef}` : ""}
    </Badge>
  );
}

function EvidenceFields({ evidence, evidenceRef, onEvidence, onRef }: { evidence: FitEvidence; evidenceRef: string; onEvidence: (e: FitEvidence) => void; onRef: (r: string) => void }) {
  const t = useTranslations("catalogAdmin.editor");
  const needsRef = evidence === "MANUFACTURER_DOCUMENT" || evidence === "OEM_CROSS_REFERENCE";
  return (
    <>
      <Field label={t("evidenceLabel")} className="w-56">
        <select className={input} value={evidence} onChange={(e) => onEvidence(e.target.value as FitEvidence)}>
          {FIT_EVIDENCE.map((k) => (
            <option key={k} value={k}>
              {t(`evidence.${k}`)}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t("evidenceRef")} hint={needsRef ? t("evidenceRefNeeded") : undefined} className="w-64">
        <input className={input} value={evidenceRef} onChange={(e) => onRef(e.target.value)} required={needsRef} maxLength={300} />
      </Field>
    </>
  );
}

/**
 * What each variant fits outside the catalogue (ADR-080): a vehicle, a device
 * or an appliance, with what each fitment rests on. Only a manufacturer
 * document, an OEM cross-reference or a staff test makes it verified.
 */
function FitmentPanel({ product, canWrite, onChange }: { product: AdminProduct; canWrite: boolean; onChange: () => void }) {
  const t = useTranslations("catalogAdmin.editor");
  const [f, setF] = useState({ sku: product.variants[0]?.sku ?? "", kind: "VEHICLE" as AdminFitment["kind"], make: "", model: "", yearFrom: "", yearTo: "", detail: "" });
  const [evidence, setEvidence] = useState<FitEvidence>("SELLER_DECLARED");
  const [evidenceRef, setEvidenceRef] = useState("");
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }));
  const rows = product.variants.flatMap((v) => (v.fitments ?? []).map((fit) => ({ ...fit, sku: v.sku })));
  const years = (a: number | null, b: number | null) => (a && b ? `${a}–${b}` : a ? `${a}+` : b ? `–${b}` : "");

  async function add(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post("/admin/catalog/fitments", {
        sku: f.sku,
        kind: f.kind,
        make: f.make,
        model: f.model,
        yearFrom: f.yearFrom ? Number(f.yearFrom) : null,
        yearTo: f.yearTo ? Number(f.yearTo) : null,
        detail: f.detail.trim() || null,
        evidence,
        evidenceRef: evidenceRef.trim() || null,
      });
      setF((x) => ({ ...x, model: "", yearFrom: "", yearTo: "", detail: "" }));
      setEvidenceRef("");
      onChange();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function remove(id: string) {
    try {
      await api.delete(`/admin/catalog/fitments/${id}`);
      onChange();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <Panel title={t("fitments")} hint={t("fitmentsHint")}>
      {rows.length ? (
        <ul className="mb-4 divide-y divide-line text-sm">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span>
                <span className="rb-mono">{r.sku}</span> · {t(`fitmentKinds.${r.kind}`)} · <span className="font-medium">{[r.make, r.model, years(r.yearFrom, r.yearTo)].filter(Boolean).join(" ")}</span>
                {r.detail ? ` (${r.detail})` : ""} <EvidenceBadge evidence={r.evidence} evidenceRef={r.evidenceRef} />
              </span>
              {canWrite ? (
                <Button variant="ghost" size="s" onClick={() => remove(r.id)}>
                  {t("remove")}
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-4 text-sm text-ink-muted">{t("noFitments")}</p>
      )}
      {canWrite ? (
        <form onSubmit={add} className="flex flex-wrap items-end gap-2">
          <Field label={t("fromSku")} className="w-44">
            <select className={input} value={f.sku} onChange={set("sku")}>
              {product.variants.map((v) => (
                <option key={v.id} value={v.sku}>
                  {v.sku}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("fitmentKind")} className="w-40">
            <select className={input} value={f.kind} onChange={set("kind")}>
              {FITMENT_KINDS.map((k) => (
                <option key={k} value={k}>
                  {t(`fitmentKinds.${k}`)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("make")} className="w-40">
            <input className={input} value={f.make} onChange={set("make")} required maxLength={80} />
          </Field>
          <Field label={t("model")} className="w-44">
            <input className={input} value={f.model} onChange={set("model")} required maxLength={80} />
          </Field>
          <Field label={t("yearFrom")} className="w-28">
            <input className={input} value={f.yearFrom} onChange={set("yearFrom")} inputMode="numeric" pattern="\d{4}" />
          </Field>
          <Field label={t("yearTo")} className="w-28">
            <input className={input} value={f.yearTo} onChange={set("yearTo")} inputMode="numeric" pattern="\d{4}" />
          </Field>
          <Field label={t("detail")} className="w-40">
            <input className={input} value={f.detail} onChange={set("detail")} maxLength={80} />
          </Field>
          <EvidenceFields evidence={evidence} evidenceRef={evidenceRef} onEvidence={setEvidence} onRef={setEvidenceRef} />
          <Button type="submit" variant="secondary" size="m">
            {t("addFitment")}
          </Button>
        </form>
      ) : null}
      {error ? (
        <p role="alert" className="mt-2 text-sm text-critical">
          {error}
        </p>
      ) : null}
    </Panel>
  );
}
