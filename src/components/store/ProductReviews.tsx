"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useAuth, useClerk } from "@clerk/nextjs";
import { useTranslations } from "next-intl";
import { Field, input } from "@/components/ui/form/Form";
import { call } from "@/components/checkout/http";

interface PublicReview {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  author: string;
  verified: boolean;
  createdAt: string;
}

interface Mine {
  canWrite: boolean;
  reason: "ALREADY" | "NOT_RECEIVED" | null;
  review: { id: string; rating: number; title: string | null; body: string; status: string } | null;
}

export function ProductReviews({ slug }: { slug: string }) {
  const t = useTranslations("store.product.reviews");
  const { isLoaded, isSignedIn } = useAuth();
  const clerk = useClerk();
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
    if (!isSignedIn) {
      setMine(null);
      return;
    }
    try {
      setMine(await call<Mine>("GET", `/me/reviews/for/${slug}`));
    } catch {
      setMine(null);
    }
  }, [isSignedIn, slug]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadPublic();
  }, [loadPublic]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isLoaded) loadMine();
  }, [isLoaded, loadMine]);

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
          </li>
        ))}
      </ul>
      {isLoaded && isSignedIn && mine?.review ? (
        <p className="mt-4 text-sm text-ink-muted">{t(`mine.${mine.review.status}` as "mine.PENDING")}</p>
      ) : null}
      {isLoaded && isSignedIn && mine?.canWrite ? (
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
      {isLoaded && !isSignedIn ? (
        <p className="mt-4 text-sm text-ink-muted">
          <button type="button" className="underline" onClick={() => clerk.openSignIn()}>
            {t("signIn")}
          </button>
        </p>
      ) : null}
    </section>
  );
}
