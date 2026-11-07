"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Field, input } from "@/components/ui/form/Form";
import { ApiError, call } from "@/components/checkout/http";

interface PublicQuestion {
  id: string;
  body: string;
  author: string;
  createdAt: string;
  answer: string | null;
  answeredAt: string | null;
}

interface Mine {
  canAsk: boolean;
  questions: { id: string; body: string; status: string; answer: string | null }[];
}

export function ProductQuestions({ slug }: { slug: string }) {
  const t = useTranslations("store.product.questions");
  // Store pages run without Clerk (ADR-030): the API says who is signed in, from the session cookie.
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [list, setList] = useState<PublicQuestion[] | null>(null);
  const [mine, setMine] = useState<Mine | null>(null);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const loadPublic = useCallback(async () => {
    try {
      setList((await call<{ questions: PublicQuestion[] }>("GET", `/catalog/products/${slug}/questions`)).questions);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [slug]);

  const loadMine = useCallback(async () => {
    try {
      setMine(await call<Mine>("GET", `/me/questions/for/${slug}`));
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
      await call("POST", `/catalog/products/${slug}/questions`, { body: body.trim() });
      setBody("");
      await loadMine();
      await loadPublic();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  }

  const pending = mine?.questions.filter((q) => q.status === "PENDING") ?? [];

  return (
    <section aria-labelledby="questions-title" className="mt-12">
      <h2 id="questions-title" className="rb-title-l mb-4">
        {t("title")}
      </h2>
      {list && list.length === 0 ? <p className="text-sm text-ink-muted">{t("empty")}</p> : null}
      <ul className="space-y-4">
        {(list ?? []).map((q) => (
          <li key={q.id} className="rounded-[var(--radius-m)] border border-line bg-surface-raised p-4 text-sm">
            <p className="font-medium">
              {t("askedBy", { name: q.author })}
            </p>
            <p className="mt-1 text-ink">{q.body}</p>
            {q.answer ? (
              <p className="mt-2 text-ink-muted">
                <span className="font-medium text-ink">{t("answer")}: </span>
                {q.answer}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
      {pending.length ? <p className="mt-4 text-sm text-ink-muted">{t("pending")}</p> : null}
      {signedIn && mine?.canAsk ? (
        <form onSubmit={submit} className="mt-6 grid max-w-xl gap-3 rounded-[var(--radius-m)] border border-line bg-surface-raised p-4">
          <Field label={t("body")}>
            <textarea className={`${input} min-h-[5rem] py-2`} value={body} onChange={(e) => setBody(e.target.value)} required minLength={10} maxLength={500} />
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
