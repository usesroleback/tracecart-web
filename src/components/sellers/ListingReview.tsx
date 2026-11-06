"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { Field, input } from "@/components/ui/form/Form";
import { QueueChip, useListFilters } from "@/components/console/ListTools";
import { call } from "@/components/checkout/http";
import { useFormat } from "@/lib/format";
import { Listing, listingTitle } from "./SellerListings";
import { percent } from "./SellerPanel";

const STATUSES = ["DRAFT", "IN_REVIEW", "ACTIVE", "PAUSED", "DELISTED"] as const;
const TONE = { DRAFT: "default", IN_REVIEW: "info", ACTIVE: "positive", PAUSED: "attn", DELISTED: "critical" } as const;
const LIST_FILTERS = ["q", "status", "queue"] as const;
const box = "rounded-[var(--radius-m)] border border-line bg-surface-raised p-5 text-sm";

export function ListingsList() {
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
      const res = await call<{ items: Listing[]; nextCursor: string | null }>("GET", `/listings?${p}`);
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
      <h1 className="rb-headline mb-1 text-[28px]">{t("title")}</h1>
      <p className="mb-6 text-sm text-ink-muted">{t("lead")}</p>
      {applied.queue ? <QueueChip label={t(`queues.${applied.queue}` as "queues.toReview")} onClear={() => apply({ ...applied, queue: "" })} /> : null}
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
      {error ? <p className="mb-4 text-sm text-critical">{error}</p> : null}
      {rows.length === 0 ? <p className="text-sm text-ink-muted">{t("empty")}</p> : null}
      <ul className="grid gap-2">
        {rows.map((row) => (
          <li key={row.id}>
            <Link href={`/listings/${row.id}`} className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-m)] border border-line bg-surface-raised px-4 py-3 text-sm hover:border-line-strong">
              <span>
                <span className="font-medium">{listingTitle(row, locale)}</span>
                <span className="ml-2 text-ink-muted">{row.seller.name}</span>
              </span>
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

export function ListingDetail({ id }: { id: string }) {
  const t = useTranslations("listings");
  const locale = useLocale();
  const format = useFormat();
  const [listing, setListing] = useState<Listing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [rejectWhy, setRejectWhy] = useState("");
  const [takeDownWhy, setTakeDownWhy] = useState("");

  const load = useCallback(async () => {
    setListing(await call<Listing>("GET", `/listings/${id}`));
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load().catch((e) => setError((e as Error).message));
  }, [load]);

  async function act(fn: () => Promise<Listing>) {
    setBusy(true);
    setError(null);
    try {
      setListing(await fn());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!listing) {
    return error ? <p role="alert" className="text-sm text-critical">{error}</p> : <p className="text-sm text-ink-muted">{t("empty")}</p>;
  }

  return (
    <div className="max-w-3xl">
      {error ? (
        <p role="alert" className="mb-4 text-sm text-critical">
          {error}
        </p>
      ) : null}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="rb-headline text-[28px]">{listingTitle(listing, locale)}</h1>
        <Badge variant={TONE[listing.status]}>{t(`statuses.${listing.status}`)}</Badge>
      </div>
      <p className="mb-1 text-sm">
        {t("seller")}: {listing.seller.name}
      </p>
      <p className="mb-4 text-sm text-ink-muted">{t("commission", { rate: percent(listing.commissionBps) })}</p>
      <dl className={`${box} mb-4 grid gap-1 sm:grid-cols-2`}>
        <div>
          <dt className="text-ink-muted">{t("price")}</dt>
          <dd className="rb-numeral">{format.money(listing.priceMinor, listing.currency)}</dd>
        </div>
        <div>
          <dt className="text-ink-muted">{t("quantity")}</dt>
          <dd>{listing.quantity}</dd>
        </div>
        <div>
          <dt className="text-ink-muted">{t("condition")}</dt>
          <dd>{t(`conditions.${listing.condition}`)}</dd>
        </div>
        <div>
          <dt className="text-ink-muted">{t("category")}</dt>
          <dd>{listing.product.category.name[locale] || listing.product.category.name.fr || listing.product.category.name.en}</dd>
        </div>
      </dl>
      {listing.product.photos.length ? (
        <div className="mb-4 grid grid-cols-4 gap-2">
          {listing.product.photos.map((mediaId) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={mediaId} src={`/api/tracecart/listings/${listing.id}/photos/${mediaId}/file`} alt="" className="aspect-square w-full rounded-[var(--radius-s)] object-cover" />
          ))}
        </div>
      ) : null}
      {listing.status === "IN_REVIEW" ? (
        <div className={`${box} mb-4 grid gap-3`}>
          <Button variant="primary" loading={busy} onClick={() => act(() => call("POST", `/listings/${id}/decision`, { decision: "APPROVE" }))}>
            {t("approve")}
          </Button>
          <Field label={t("rejectWhy")} required>
            <textarea className={`${input} h-auto min-h-[4rem] py-2`} required minLength={3} value={rejectWhy} onChange={(e) => setRejectWhy(e.target.value)} />
          </Field>
          <Button variant="secondary" loading={busy} disabled={rejectWhy.trim().length < 3} onClick={() => act(() => call("POST", `/listings/${id}/decision`, { decision: "REJECT", note: rejectWhy.trim() }))}>
            {t("reject")}
          </Button>
        </div>
      ) : null}
      {listing.status !== "DELISTED" ? (
        <form
          className={`${box} grid gap-3`}
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            act(() => call("POST", `/listings/${id}/take-down`, { reason: takeDownWhy.trim() }));
          }}
        >
          <Field label={t("takeDownWhy")} required>
            <textarea className={`${input} h-auto min-h-[4rem] py-2`} required minLength={3} value={takeDownWhy} onChange={(e) => setTakeDownWhy(e.target.value)} />
          </Field>
          <Button type="submit" variant="secondary" loading={busy}>
            {t("takeDownCta")}
          </Button>
        </form>
      ) : null}
    </div>
  );
}
