"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Field, input } from "@/components/ui/form/Form";
import { ApiError, call } from "@/components/checkout/http";

interface PublicReview {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  author: string;
  verified: boolean;
  createdAt: string;
  photos: { id: string; url: string }[];
  sellerReply: { body: string; seller: string } | null;
}

interface Mine {
  canWrite: boolean;
  reason: "ALREADY" | "NOT_RECEIVED" | null;
  review: { id: string; rating: number; title: string | null; body: string; status: string; photos: string[]; canAddPhotos: boolean } | null;
}

export function ProductReviews({ slug }: { slug: string }) {
  const t = useTranslations("store.product.reviews");
  // Store pages run without Clerk (ADR-030): the API says who is signed in, from the session cookie.
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [list, setList] = useState<{ count: number; average: number | null; reviews: PublicReview[] } | null>(null);
  const [mine, setMine] = useState<Mine | null>(null);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const loadPublic = useCallback(async () => {
    try {
      setList(await call<{ count: number; average: number | null; reviews: PublicReview[] }>("GET", `/catalog/products/${slug}/reviews`));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [slug]);

  const loadMine = useCallback(async () => {
    try {
      setMine(await call<Mine>("GET", `/me/reviews/for/${slug}`));
      setSignedIn(true);
    } catch (e) {
      setMine(null);
      // Signed out is a 401; anything else says nothing about who this is.
      setSignedIn(e instanceof ApiError && e.status === 401 ? false : null);
    }
  }, [slug]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadPublic();
  }, [loadPublic]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadMine();
  }, [loadMine]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(null);
    try {
      await call("POST", `/catalog/products/${slug}/reviews`, { rating, title: title.trim() || undefined, body: body.trim() });
      setTitle("");
      setBody("");
      await loadMine();
      await loadPublic();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  }

  return (
    <section aria-labelledby="reviews-title" className="mt-12">
      <h2 id="reviews-title" className="rb-title-l mb-4">
        {t("title")}
        {list && list.count > 0 && list.average != null ? <span className="ml-2 text-base font-normal text-ink-muted">{t("summary", { average: list.average, count: list.count })}</span> : null}
      </h2>
      {list && list.reviews.length === 0 ? <p className="text-sm text-ink-muted">{t("empty")}</p> : null}
      <ul className="space-y-4">
        {(list?.reviews ?? []).map((r) => (
          <li key={r.id} className="rounded-[var(--radius-m)] border border-line bg-surface-raised p-4 text-sm">
            <p className="font-medium">
              {t("stars", { rating: r.rating })} · {r.author}
              {r.verified ? <span className="ml-2 text-ink-muted">{t("verified")}</span> : null}
            </p>
            {r.title ? <p className="mt-1 font-medium">{r.title}</p> : null}
            <p className="mt-1 text-ink">{r.body}</p>
            {r.photos.length ? (
              <ul className="mt-3 flex flex-wrap gap-2" aria-label={t("photos")}>
                {r.photos.map((p, i) => (
                  <li key={p.id}>
                    <a href={p.url} target="_blank" rel="noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element -- a signed link, served through the API */}
                      <img src={p.url} alt={t("photoAlt", { index: i + 1, author: r.author })} className="h-20 w-20 rounded-[var(--radius-s)] border border-line object-cover" loading="lazy" />
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
            {r.sellerReply ? (
              <div className="mt-3 border-l-2 border-line pl-3">
                <p className="text-xs font-medium text-ink-muted">{t("sellerReply", { seller: r.sellerReply.seller })}</p>
                <p className="mt-1 text-ink">{r.sellerReply.body}</p>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
      {signedIn && mine?.review ? (
        <div className="mt-4 text-sm">
          <p className="text-ink-muted">{t(`mine.${mine.review.status}` as "mine.PENDING")}</p>
          <MyPhotos review={mine.review} onChange={loadMine} />
        </div>
      ) : null}
      {signedIn && mine?.canWrite ? (
        <form onSubmit={submit} className="mt-6 grid max-w-xl gap-3 rounded-[var(--radius-m)] border border-line bg-surface-raised p-4">
          <Field label={t("rating")}>
            <select className={input} value={rating} onChange={(e) => setRating(Number(e.target.value))}>
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {t("stars", { rating: n })}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("reviewTitle")}>
            <input className={input} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} />
          </Field>
          <Field label={t("body")}>
            <textarea className={`${input} min-h-[6rem] py-2`} value={body} onChange={(e) => setBody(e.target.value)} required minLength={20} maxLength={2000} />
          </Field>
          {error ? (
            <p role="alert" className="text-sm text-critical">
              {error}
            </p>
          ) : null}
          <button type="submit" disabled={sending} className="h-11 rounded-[var(--radius-s)] bg-ink px-4 font-medium text-ink-inverse disabled:opacity-50">
            {t("submit")}
          </button>
        </form>
      ) : null}
      {signedIn === false ? (
        <p className="mt-4 text-sm text-ink-muted">
          <Link href="/account" className="underline">
            {t("signIn")}
          </Link>
        </p>
      ) : null}
    </section>
  );
}

/** The author's photos on a waiting review (ADR-072): private until it is published. */
function MyPhotos({ review, onChange }: { review: NonNullable<Mine["review"]>; onChange: () => Promise<void> }) {
  const t = useTranslations("store.product.reviews");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const url = (id: string) => `/api/tracecart/me/reviews/${review.id}/photos/${id}/file`;

  async function add(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("photo", file);
      await call("POST", `/me/reviews/${review.id}/photos`, form);
      await onChange();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    setError(null);
    try {
      await call("DELETE", `/me/reviews/${review.id}/photos/${id}`);
      await onChange();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!review.photos.length && !review.canAddPhotos) return null;
  return (
    <div className="mt-3">
      {review.photos.length ? (
        <ul className="flex flex-wrap gap-2" aria-label={t("photos")}>
          {review.photos.map((id, i) => (
            <li key={id} className="flex flex-col items-start gap-1">
              {/* eslint-disable-next-line @next/next/no-img-element -- a signed link, served through the API */}
              <img src={url(id)} alt={t("myPhotoAlt", { index: i + 1 })} className="h-20 w-20 rounded-[var(--radius-s)] border border-line object-cover" />
              {review.status === "PENDING" ? (
                <button type="button" disabled={busy} className="text-xs text-ink-muted underline" onClick={() => remove(id)}>
                  {t("removePhoto")}
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {review.canAddPhotos ? (
        <label className="mt-2 inline-flex cursor-pointer items-center gap-2 text-sm font-medium underline">
          {t("addPhoto")}
          <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={busy} onChange={(e) => add(e.target.files?.[0])} />
        </label>
      ) : null}
      {error ? (
        <p role="alert" className="mt-2 text-critical">
          {error}
        </p>
      ) : null}
    </div>
  );
}
