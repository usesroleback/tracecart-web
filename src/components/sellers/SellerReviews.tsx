"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { call } from "@/components/checkout/http";

type Status = "PENDING" | "APPROVED" | "REJECTED";
const TONE: Record<Status, "info" | "positive" | "critical"> = { PENDING: "info", APPROVED: "positive", REJECTED: "critical" };

interface Row {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  author: string;
  createdAt: string;
  product: { slug: string; title: string };
  photos: { id: string; url: string }[];
  reply: { body: string; status: Status } | null;
  canReply: boolean;
}

/** Published reviews of the shop's sales, and its one answer to each (ADR-072). */
export function SellerReviews() {
  const t = useTranslations("reviews.sellerReviews");
  const [unanswered, setUnanswered] = useState(false);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async (onlyUnanswered: boolean) => {
    try {
      setRows((await call<{ items: Row[] }>("GET", `/seller/reviews${onlyUnanswered ? "?unanswered=true" : ""}`)).items);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(unanswered);
  }, [load, unanswered]);

  async function reply(id: string) {
    const body = (drafts[id] ?? "").trim();
    if (!body) return;
    setBusy(id);
    setError(null);
    try {
      const next = await call<Row>("POST", `/seller/reviews/${id}/reply`, { body });
      setRows((prev) => (prev ?? []).map((r) => (r.id === id ? next : r)));
      setDrafts((d) => ({ ...d, [id]: "" }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="max-w-3xl">
      <h1 className="rb-headline mb-1 text-[28px]">{t("title")}</h1>
      <p className="mb-4 text-sm text-ink-muted">{t("lead")}</p>
      <label className="mb-6 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={unanswered} onChange={(e) => setUnanswered(e.target.checked)} />
        {t("unanswered")}
      </label>
      {error ? <p role="alert" className="mb-4 text-sm text-critical">{error}</p> : null}
      {rows && !rows.length ? <p className="text-sm text-ink-muted">{t("empty")}</p> : null}
      <ul className="grid gap-3">
        {(rows ?? []).map((r) => (
          <li key={r.id} className="rounded-[var(--radius-m)] border border-line bg-surface-raised p-5 text-sm">
            <p className="font-medium">
              {t("stars", { rating: r.rating })} · {r.author} ·{" "}
              <Link href={`/p/${r.product.slug}`} className="underline">
                {r.product.title}
              </Link>
            </p>
            {r.title ? <p className="mt-1 font-medium">{r.title}</p> : null}
            <p className="mt-1 text-ink">{r.body}</p>
            {r.photos.length ? (
              <ul className="mt-3 flex flex-wrap gap-2">
                {r.photos.map((p, i) => (
                  <li key={p.id}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- a signed link, served through the API */}
                    <img src={p.url} alt={t("photoAlt", { index: i + 1 })} className="h-20 w-20 rounded-[var(--radius-s)] border border-line object-cover" />
                  </li>
                ))}
              </ul>
            ) : null}
            {r.reply ? (
              <div className="mt-3 border-l-2 border-line pl-3">
                <p className="flex items-center gap-2 text-xs font-medium text-ink-muted">
                  {t("yourReply")}
                  <Badge variant={TONE[r.reply.status]}>{t(`statuses.${r.reply.status}`)}</Badge>
                </p>
                <p className="mt-1 text-ink">{r.reply.body}</p>
              </div>
            ) : null}
            {r.canReply ? (
              <form
                className="mt-4 grid gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  reply(r.id);
                }}
              >
                <label className="text-sm font-medium" htmlFor={`reply-${r.id}`}>
                  {r.reply ? t("replyAgain") : t("reply")}
                </label>
                <textarea
                  id={`reply-${r.id}`}
                  className="min-h-[4rem] rounded-[var(--radius-s)] border border-line-strong px-3 py-2"
                  value={drafts[r.id] ?? ""}
                  onChange={(e) => setDrafts((d) => ({ ...d, [r.id]: e.target.value }))}
                  required
                  minLength={10}
                  maxLength={1000}
                />
                <p className="text-xs text-ink-muted">{t("replyHint")}</p>
                <Button type="submit" variant="secondary" disabled={busy === r.id}>
                  {t("send")}
                </Button>
              </form>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
