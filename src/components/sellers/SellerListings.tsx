"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { Field, input } from "@/components/ui/form/Form";
import { QueueChip, useListFilters } from "@/components/console/ListTools";
import { call } from "@/components/checkout/http";
import { useFormat } from "@/lib/format";
import { percent } from "./SellerPanel";

export type ListingStatus = "DRAFT" | "IN_REVIEW" | "ACTIVE" | "PAUSED" | "DELISTED";
const STATUSES: ListingStatus[] = ["DRAFT", "IN_REVIEW", "ACTIVE", "PAUSED", "DELISTED"];
const TONE: Record<ListingStatus, "default" | "info" | "positive" | "attn" | "critical"> = {
  DRAFT: "default",
  IN_REVIEW: "info",
  ACTIVE: "positive",
  PAUSED: "attn",
  DELISTED: "critical",
};
const LIST_FILTERS = ["q", "status", "queue"] as const;
const box = "rounded-[var(--radius-m)] border border-line bg-surface-raised p-5 text-sm";

export interface Listing {
  id: string;
  status: ListingStatus;
  condition: "NEW" | "REFURBISHED" | "USED";
  priceMinor: number;
  compareAtMinor: number | null;
  currency: string;
  handlingDays: number;
  fulfillmentType: "SELLER_FULFILLED" | "FULFILLED_BY_TRACECART";
  quantity: number;
  held: number;
  commissionBps: number;
  reviewNote: string | null;
  approved: boolean;
  seller: { id: string; name: string };
  warehouse: { id: string; city: string; countryCode: string } | null;
  variant: { id: string; sku: string; options: Record<string, string> | null; weightGrams: number | null };
  product: {
    id: string;
    slug: string;
    status: string;
    proposed: boolean;
    title: Record<string, string>;
    description: Record<string, string> | null;
    attributes: Record<string, unknown>;
    warrantyMonths: number | null;
    category: { id: string; slug: string; name: Record<string, string> };
    brand: { id: string; name: string } | null;
    photos: string[];
  };
}

export function listingTitle(l: Listing, locale: string) {
  return l.product.title[locale] || l.product.title.fr || l.product.title.en || l.variant.sku;
}

export function SellerListings() {
  const t = useTranslations("listings");
  const locale = useLocale();
  const format = useFormat();
  const { applied, query, apply } = useListFilters(LIST_FILTERS);
  const [q, setQ] = useState(applied.q);
  const [rows, setRows] = useState<Listing[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (after: string | null, filters: string) => {
    const p = new URLSearchParams(filters);
    p.set("limit", "50");
    if (after) p.set("cursor", after);
    try {
      const res = await call<{ items: Listing[]; nextCursor: string | null }>("GET", `/seller/listings?${p}`);
      setRows((prev) => (after ? [...prev, ...res.items] : res.items));
      setCursor(res.nextCursor);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQ(applied.q);
    load(null, query);
  }, [load, query, applied.q]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="rb-headline text-[28px]">{t("mine")}</h1>
          <p className="mt-1 text-sm text-ink-muted">{t("mineLead")}</p>
        </div>
        <Button href="/seller/listings/new" variant="primary">
          {t("new")}
        </Button>
      </div>
      {error ? (
        <p role="alert" className="mb-4 text-sm text-critical">
          {error}
        </p>
      ) : null}
      {applied.queue ? <QueueChip label={t(`queues.${applied.queue}` as "queues.toFix")} onClear={() => apply({ ...applied, queue: "" })} /> : null}
      <form
        role="search"
        className="mb-4 flex flex-wrap gap-2"
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          apply({ ...applied, q });
        }}
      >
        <input className={`${input} max-w-sm`} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search")} aria-label={t("search")} />
        <select className={`${input} max-w-[14rem]`} aria-label={t("status")} value={applied.status} onChange={(e) => apply({ ...applied, q, status: e.target.value })}>
          <option value="">{t("allStatuses")}</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {t(`statuses.${s}`)}
            </option>
          ))}
        </select>
        <Button type="submit" variant="secondary">
          {t("find")}
        </Button>
      </form>
      {rows.length === 0 ? <p className="text-sm text-ink-muted">{t("empty")}</p> : null}
      <ul className="grid gap-2">
        {rows.map((row) => (
          <li key={row.id}>
            <Link href={`/seller/listings/${row.id}`} className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-m)] border border-line bg-surface-raised px-4 py-3 text-sm hover:border-line-strong">
              <span className="font-medium">{listingTitle(row, locale)}</span>
              <span className="flex items-center gap-3">
                <Badge variant={TONE[row.status]}>{t(`statuses.${row.status}`)}</Badge>
                <span className="rb-numeral">{format.money(row.priceMinor, row.currency)}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {cursor ? (
        <Button className="mt-4" variant="secondary" onClick={() => load(cursor, query)}>
          {t("more")}
        </Button>
      ) : null}
    </div>
  );
}

export function SellerListingEditor({ id }: { id?: string }) {
  const t = useTranslations("listings");
  const locale = useLocale();
  const format = useFormat();
  const router = useRouter();
  const [listing, setListing] = useState<Listing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setListing(await call<Listing>("GET", `/seller/listings/${id}`));
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load().catch((e) => setError((e as Error).message));
  }, [load]);

  async function act(fn: () => Promise<Listing>) {
    setBusy(true);
    setError(null);
    try {
      const next = await fn();
      setListing(next);
      if (!id) router.push(`/seller/listings/${next.id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const alert = error ? (
    <p role="alert" className="mb-4 text-sm text-critical">
      {error}
    </p>
  ) : null;

  if (id && !listing) return alert ?? <p className="text-sm text-ink-muted">{t("empty")}</p>;

  const draft = !listing || listing.status === "DRAFT";
  const live = listing?.status === "ACTIVE" || listing?.status === "PAUSED";

  return (
    <div className="max-w-3xl">
      {listing ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h1 className="rb-headline text-[28px]">{listingTitle(listing, locale)}</h1>
          <Badge variant={TONE[listing.status]}>{t(`statuses.${listing.status}`)}</Badge>
        </div>
      ) : (
        <h1 className="rb-headline mb-4 text-[28px]">{t("new")}</h1>
      )}
      {alert}
      {listing ? <p className="mb-4 text-sm text-ink-muted">{t(`explain.${listing.status}`)}</p> : null}
      {listing?.reviewNote ? (
        <p className="mb-4 whitespace-pre-line rounded-[var(--radius-m)] border border-attn bg-attn-soft p-3 text-sm">
          <span className="mb-1 block font-medium">{t("note")}</span>
          {listing.reviewNote}
        </p>
      ) : null}

      {draft && !listing ? <CreateForm busy={busy} onCreate={(body) => act(() => call("POST", "/seller/listings", body))} /> : null}

      {listing && (draft || live) ? (
        <TermsForm
          listing={listing}
          locked={!draft && !live}
          productLocked={!draft}
          busy={busy}
          onSave={(body) => act(() => call("PATCH", `/seller/listings/${listing.id}`, body))}
          onQuantity={(quantity) => act(() => call("PUT", `/seller/listings/${listing.id}/quantity`, { quantity }))}
        />
      ) : null}

      {listing?.product.proposed && draft ? (
        <section className={`${box} mt-4`} aria-labelledby="listing-photos">
          <h2 id="listing-photos" className="rb-title mb-3">
            {t("photos")}
          </h2>
          <ul className="mb-3 grid gap-3 sm:grid-cols-4">
            {listing.product.photos.map((mediaId) => (
              <li key={mediaId} className="grid gap-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/tracecart/seller/listings/${listing.id}/photos/${mediaId}/file`} alt="" className="aspect-square w-full rounded-[var(--radius-s)] object-cover" />
                <Button variant="secondary" loading={busy} onClick={() => act(() => call("DELETE", `/seller/listings/${listing.id}/photos/${mediaId}`))}>
                  {t("removePhoto")}
                </Button>
              </li>
            ))}
          </ul>
          <label className="block text-ink-muted">
            <span className="sr-only">{t("addPhoto")}</span>
            <input
              className={input}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              aria-label={t("addPhoto")}
              disabled={busy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const form = new FormData();
                form.append("photo", file);
                act(() => call("POST", `/seller/listings/${listing.id}/photos`, form));
                e.target.value = "";
              }}
            />
          </label>
        </section>
      ) : listing && listing.product.photos.length ? (
        <div className="mt-4 grid grid-cols-4 gap-2">
          {listing.product.photos.map((mediaId) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={mediaId} src={`/api/tracecart/seller/listings/${listing.id}/photos/${mediaId}/file`} alt="" className="aspect-square w-full rounded-[var(--radius-s)] object-cover" />
          ))}
        </div>
      ) : null}

      {listing ? (
        <p className="mt-4 text-sm text-ink-muted">{t("commission", { rate: percent(listing.commissionBps) })}</p>
      ) : null}

      {listing ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {listing.status === "DRAFT" ? (
            <Button variant="primary" loading={busy} onClick={() => act(() => call("POST", `/seller/listings/${listing.id}/submit`))}>
              {t("submit")}
            </Button>
          ) : null}
          {listing.status === "IN_REVIEW" ? (
            <Button variant="secondary" loading={busy} onClick={() => act(() => call("POST", `/seller/listings/${listing.id}/withdraw`))}>
              {t("withdraw")}
            </Button>
          ) : null}
          {listing.status === "ACTIVE" ? (
            <Button variant="secondary" loading={busy} onClick={() => act(() => call("POST", `/seller/listings/${listing.id}/pause`))}>
              {t("pause")}
            </Button>
          ) : null}
          {listing.status === "PAUSED" ? (
            <Button variant="primary" loading={busy} onClick={() => act(() => call("POST", `/seller/listings/${listing.id}/resume`))}>
              {t("resume")}
            </Button>
          ) : null}
          {listing.status !== "DELISTED" ? (
            <Button variant="secondary" loading={busy} onClick={() => act(() => call("POST", `/seller/listings/${listing.id}/delist`))}>
              {t("delist")}
            </Button>
          ) : null}
        </div>
      ) : null}
      {listing ? <p className="mt-2 text-xs text-ink-muted">{format.money(listing.priceMinor, listing.currency)}</p> : null}
    </div>
  );
}

function CreateForm({ busy, onCreate }: { busy: boolean; onCreate: (body: unknown) => void }) {
  const t = useTranslations("listings");
  const locale = useLocale();
  const [kind, setKind] = useState<"catalog" | "propose">("catalog");
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<{ id: string; title: Record<string, string>; variants: { id: string; sku: string; options: Record<string, string> | null }[] }[]>([]);
  const [variantId, setVariantId] = useState("");
  const [priceMinor, setPriceMinor] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [handlingDays, setHandlingDays] = useState("1");
  const [condition, setCondition] = useState("NEW");
  const [fulfillmentType, setFulfillmentType] = useState<"SELLER_FULFILLED" | "FULFILLED_BY_TRACECART">("SELLER_FULFILLED");
  const [warehouseId, setWarehouseId] = useState("");
  const [warehouses, setWarehouses] = useState<{ id: string; city: string; countryCode: string; code: string }[]>([]);
  const [titleFr, setTitleFr] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [weightGrams, setWeightGrams] = useState("");
  const [categories, setCategories] = useState<{ id: string; parentId: string | null; name: Record<string, string> }[]>([]);

  useEffect(() => {
    call<{ categories: { id: string; parentId: string | null; name: Record<string, string> }[] }>("GET", "/seller/listings/references")
      .then((r) => setCategories(r.categories))
      .catch(() => undefined);
    call<{ items: { id: string; city: string; countryCode: string; code: string }[] }>("GET", "/seller/listings/warehouses")
      .then((r) => {
        setWarehouses(r.items);
        setWarehouseId((id) => id || r.items[0]?.id || "");
      })
      .catch(() => undefined);
  }, []);

  async function search() {
    if (q.trim().length < 2) return;
    const res = await call<{ items: typeof hits }>("GET", `/seller/listings/catalog?q=${encodeURIComponent(q.trim())}`);
    setHits(res.items);
    setVariantId(res.items[0]?.variants[0]?.id ?? "");
  }

  return (
    <form
      className={`${box} grid gap-3`}
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        const terms = {
          priceMinor: Number(priceMinor),
          handlingDays: Number(handlingDays),
          condition,
          fulfillmentType,
          ...(fulfillmentType === "FULFILLED_BY_TRACECART" ? { warehouseId } : { quantity: Number(quantity) }),
        };
        if (kind === "catalog") onCreate({ ...terms, variantId });
        else onCreate({ ...terms, product: { title: { fr: titleFr || undefined, en: titleEn || undefined }, categoryId, weightGrams: Number(weightGrams) } });
      }}
    >
      <fieldset className="grid gap-2">
        <label className="flex items-center gap-2">
          <input type="radio" name="kind" checked={kind === "catalog"} onChange={() => setKind("catalog")} />
          {t("kindCatalog")}
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" name="kind" checked={kind === "propose"} onChange={() => setKind("propose")} />
          {t("kindPropose")}
        </label>
      </fieldset>

      {kind === "catalog" ? (
        <>
          <div className="flex gap-2">
            <input className={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("catalogSearch")} aria-label={t("catalogSearch")} />
            <Button type="button" variant="secondary" onClick={() => search()}>
              {t("find")}
            </Button>
          </div>
          {hits.length === 0 ? <p className="text-ink-muted">{t("noCatalog")}</p> : null}
          <ul className="grid gap-1">
            {hits.map((p) => (
              <li key={p.id}>
                <button type="button" className="text-left font-medium underline" onClick={() => setVariantId(p.variants[0]?.id ?? "")}>
                  {p.title[locale] || p.title.fr || p.title.en}
                </button>
              </li>
            ))}
          </ul>
          {hits.length ? (
            <Field label={t("pickVariant")} required>
              <select className={input} required value={variantId} onChange={(e) => setVariantId(e.target.value)}>
                {hits.flatMap((p) =>
                  p.variants.map((v) => (
                    <option key={v.id} value={v.id}>
                      {(p.title[locale] || p.title.fr || p.title.en) + (v.sku ? ` · ${v.sku}` : "")}
                    </option>
                  ))
                )}
              </select>
            </Field>
          ) : null}
        </>
      ) : (
        <>
          <Field label={t("titleFr")}>
            <input className={input} value={titleFr} onChange={(e) => setTitleFr(e.target.value)} />
          </Field>
          <Field label={t("titleEn")}>
            <input className={input} value={titleEn} onChange={(e) => setTitleEn(e.target.value)} />
          </Field>
          <Field label={t("category")} required>
            <select className={input} required value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">{t("category")}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name[locale] || c.name.fr || c.name.en}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("weight")} required>
            <input className={input} type="number" min={1} required value={weightGrams} onChange={(e) => setWeightGrams(e.target.value)} />
          </Field>
        </>
      )}

      <Field label={t("price")} required>
        <input className={input} type="number" min={1} required value={priceMinor} onChange={(e) => setPriceMinor(e.target.value)} />
      </Field>
      <Field label={t("fulfillment")} required>
        <select className={input} value={fulfillmentType} onChange={(e) => setFulfillmentType(e.target.value as typeof fulfillmentType)}>
          <option value="SELLER_FULFILLED">{t("fulfillmentTypes.SELLER_FULFILLED")}</option>
          <option value="FULFILLED_BY_TRACECART">{t("fulfillmentTypes.FULFILLED_BY_TRACECART")}</option>
        </select>
      </Field>
      {fulfillmentType === "FULFILLED_BY_TRACECART" ? (
        <Field label={t("warehouse")} required>
          <select className={input} required value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.city} · {w.code}
              </option>
            ))}
          </select>
        </Field>
      ) : (
        <Field label={t("quantity")}>
          <input className={input} type="number" min={0} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        </Field>
      )}
      <Field label={t("handling")}>
        <input className={input} type="number" min={0} max={60} value={handlingDays} onChange={(e) => setHandlingDays(e.target.value)} />
      </Field>
      <Field label={t("condition")}>
        <select className={input} value={condition} onChange={(e) => setCondition(e.target.value)}>
          {(["NEW", "REFURBISHED", "USED"] as const).map((c) => (
            <option key={c} value={c}>
              {t(`conditions.${c}`)}
            </option>
          ))}
        </select>
      </Field>
      <Button type="submit" variant="primary" loading={busy} disabled={kind === "catalog" && !variantId}>
        {t("create")}
      </Button>
    </form>
  );
}

function TermsForm({
  listing,
  locked,
  productLocked,
  busy,
  onSave,
  onQuantity,
}: {
  listing: Listing;
  locked: boolean;
  productLocked: boolean;
  busy: boolean;
  onSave: (body: unknown) => void;
  onQuantity: (quantity: number) => void;
}) {
  const t = useTranslations("listings");
  const [priceMinor, setPriceMinor] = useState(String(listing.priceMinor));
  const [compareAtMinor, setCompareAtMinor] = useState(listing.compareAtMinor ? String(listing.compareAtMinor) : "");
  const [handlingDays, setHandlingDays] = useState(String(listing.handlingDays));
  const [quantity, setQuantity] = useState(String(listing.quantity));
  const [condition, setCondition] = useState(listing.condition);

  return (
    <div className={`${box} grid gap-3 sm:grid-cols-2`}>
      <form
        className="contents"
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          onSave({
            priceMinor: Number(priceMinor),
            compareAtMinor: compareAtMinor ? Number(compareAtMinor) : null,
            handlingDays: Number(handlingDays),
            ...(!productLocked ? { condition } : {}),
          });
        }}
      >
        <Field label={t("price")} required>
          <input className={input} type="number" min={1} required disabled={locked} value={priceMinor} onChange={(e) => setPriceMinor(e.target.value)} />
        </Field>
        <Field label={t("compareAt")}>
          <input className={input} type="number" min={0} disabled={locked} value={compareAtMinor} onChange={(e) => setCompareAtMinor(e.target.value)} />
        </Field>
        <Field label={t("handling")}>
          <input className={input} type="number" min={0} max={60} disabled={locked} value={handlingDays} onChange={(e) => setHandlingDays(e.target.value)} />
        </Field>
        {!productLocked ? (
          <Field label={t("condition")}>
            <select className={input} value={condition} onChange={(e) => setCondition(e.target.value as Listing["condition"])}>
              {(["NEW", "REFURBISHED", "USED"] as const).map((c) => (
                <option key={c} value={c}>
                  {t(`conditions.${c}`)}
                </option>
              ))}
            </select>
          </Field>
        ) : null}
        {!locked ? (
          <div className="sm:col-span-2">
            <Button type="submit" variant="secondary" loading={busy}>
              {t("save")}
            </Button>
          </div>
        ) : null}
      </form>
      {listing.fulfillmentType === "FULFILLED_BY_TRACECART" ? (
        <p className="sm:col-span-2 text-sm text-ink-muted">
          {t("inboundQuantity", { count: listing.quantity })}{" "}
          <Link href="/seller/inbounds" className="underline">
            {t("inboundCta")}
          </Link>
        </p>
      ) : (
        <form
          className="sm:col-span-2 flex flex-wrap items-end gap-2"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            onQuantity(Number(quantity));
          }}
        >
          <Field label={t("quantity")} className="min-w-[10rem] flex-1">
            <input className={input} type="number" min={0} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </Field>
          <Button type="submit" variant="secondary" loading={busy}>
            {t("save")}
          </Button>
        </form>
      )}
    </div>
  );
}
