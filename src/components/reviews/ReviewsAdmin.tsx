"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { QueueChip, useListFilters } from "@/components/console/ListTools";
import { call } from "@/components/checkout/http";

type Status = "PENDING" | "APPROVED" | "REJECTED";

interface Row {
  id: string;
  status: Status;
  rating?: number;
  title?: string | null;
  body: string;
  answer?: string | null;
  createdAt: string;
  author: { name: string; email: string };
  product: { slug: string; title: string };
  photos?: string[];
  seller?: { id: string; name: string } | null;
  sellerReply?: { body: string; status: Status; at: string } | null;
}

const TONE: Record<Status, "info" | "positive" | "critical"> = { PENDING: "info", APPROVED: "positive", REJECTED: "critical" };
const LIST_FILTERS = ["tab", "queue"] as const;
/** Still on a moderator's plate: the review, or the seller's answer to it (ADR-072). */
const waiting = (r: Row) => r.status === "PENDING" || r.sellerReply?.status === "PENDING";

export function ReviewsList() {
  const t = useTranslations("reviews");
  const { applied, query, apply } = useListFilters(LIST_FILTERS);
  const questions = applied.tab === "questions";
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [answer, setAnswer] = useState<Record<string, string>>({});

  const load = useCallback(async (filters: string) => {
    const params = new URLSearchParams(filters);
    params.delete("tab");
    const q = params.toString();
    const path = questions ? "/questions" : "/reviews";
    try {
      const res = await call<{ items: Row[] }>("GET", `${path}${q ? `?${q}` : ""}`);
      setRows(res.items);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [questions]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(query);
  }, [load, query]);

  async function decide(id: string, decision: "APPROVE" | "REJECT") {
    setError(null);
    try {
      const next = await call<Row>("POST", `${questions ? "/questions" : "/reviews"}/${id}/decide`, { decision });
      setRows((prev) => prev.map((r) => (r.id === id ? next : r)).filter((r) => (applied.queue ? waiting(r) : true)));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function decideReply(id: string, decision: "APPROVE" | "REJECT") {
    setError(null);
    try {
      const next = await call<Row>("POST", `/reviews/${id}/reply/decide`, { decision });
      setRows((prev) => prev.map((r) => (r.id === id ? next : r)).filter((r) => (applied.queue ? waiting(r) : true)));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function reply(id: string) {
    const text = (answer[id] ?? "").trim();
    if (!text) return;
    setError(null);
    try {
      const next = await call<Row>("POST", `/questions/${id}/answer`, { answer: text });
      setRows((prev) => prev.map((r) => (r.id === id ? next : r)).filter((r) => (applied.queue === "toReview" ? r.status === "PENDING" : true)));
      setAnswer((a) => ({ ...a, [id]: "" }));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div>
      <h1 className="rb-headline mb-1 text-[28px]">{questions ? t("questionsTitle") : t("title")}</h1>
      <p className="mb-4 text-sm text-ink-muted">{questions ? t("questionsLead") : t("lead")}</p>
      <div className="mb-6 flex gap-2" role="tablist">
        <button type="button" role="tab" aria-selected={!questions} className={`rounded-[var(--radius-s)] border px-3 py-2 text-sm ${!questions ? "border-ink bg-ink text-ink-inverse" : "border-line"}`} onClick={() => apply({ ...applied, tab: "" })}>
          {t("tabs.reviews")}
        </button>
        <button type="button" role="tab" aria-selected={questions} className={`rounded-[var(--radius-s)] border px-3 py-2 text-sm ${questions ? "border-ink bg-ink text-ink-inverse" : "border-line"}`} onClick={() => apply({ ...applied, tab: "questions" })}>
          {t("tabs.questions")}
        </button>
      </div>
      {applied.queue ? <QueueChip label={t(`queues.${applied.queue}` as "queues.toReview")} onClear={() => apply({ ...applied, queue: "" })} /> : null}
      {error ? <p className="mb-4 text-sm text-critical">{error}</p> : null}
      {rows.length === 0 ? <p className="text-sm text-ink-muted">{t("empty")}</p> : null}
      <ul className="grid gap-3">
        {rows.map((r) => (
          <li key={r.id} className="rounded-[var(--radius-m)] border border-line bg-surface-raised p-5 text-sm">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge variant={TONE[r.status]}>{t(`statuses.${r.status}`)}</Badge>
              {r.rating != null ? <span className="rb-numeral">{t("stars", { rating: r.rating })}</span> : null}
              <Link href={`/p/${r.product.slug}`} className="font-medium underline">
                {r.product.title}
              </Link>
              <span className="text-ink-muted">{r.author.name}</span>
            </div>
            {r.title ? <p className="font-medium">{r.title}</p> : null}
            <p className="mt-1 text-ink">{r.body}</p>
            {r.photos?.length ? (
              <ul className="mt-3 flex flex-wrap gap-2" aria-label={t("photos")}>
                {r.photos.map((p, i) => (
                  <li key={p}>
                    <a href={`/api/tracecart/reviews/${r.id}/photos/${p}/file`} target="_blank" rel="noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element -- a signed link, served through the API */}
                      <img src={`/api/tracecart/reviews/${r.id}/photos/${p}/file`} alt={t("photoAlt", { index: i + 1 })} className="h-20 w-20 rounded-[var(--radius-s)] border border-line object-cover" />
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
            {r.sellerReply ? (
              <div className="mt-3 border-l-2 border-line pl-3">
                <p className="flex flex-wrap items-center gap-2 text-xs font-medium text-ink-muted">
                  {t("sellerReply", { seller: r.seller?.name ?? "" })}
                  <Badge variant={TONE[r.sellerReply.status]}>{t(`statuses.${r.sellerReply.status}`)}</Badge>
                </p>
                <p className="mt-1 text-ink">{r.sellerReply.body}</p>
                {r.sellerReply.status === "PENDING" ? (
                  <div className="mt-3 flex gap-2">
                    <Button type="button" variant="primary" onClick={() => decideReply(r.id, "APPROVE")}>
                      {t("approveReply")}
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => decideReply(r.id, "REJECT")}>
                      {t("reject")}
                    </Button>
                  </div>
                ) : null}
              </div>
            ) : null}
            {r.answer ? <p className="mt-2 text-ink-muted">{t("answerLabel")}: {r.answer}</p> : null}
            {r.status === "PENDING" ? (
              <div className="mt-4 flex gap-2">
                <Button type="button" variant="primary" onClick={() => decide(r.id, "APPROVE")}>
                  {t("approve")}
                </Button>
                <Button type="button" variant="secondary" onClick={() => decide(r.id, "REJECT")}>
                  {t("reject")}
                </Button>
              </div>
            ) : null}
            {questions && r.status !== "REJECTED" && !r.answer ? (
              <form
                className="mt-4 grid gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  reply(r.id);
                }}
              >
                <textarea className="min-h-[4rem] rounded-[var(--radius-s)] border border-line-strong px-3 py-2" value={answer[r.id] ?? ""} onChange={(e) => setAnswer((a) => ({ ...a, [r.id]: e.target.value }))} required maxLength={2000} />
                <Button type="submit" variant="secondary">
                  {t("answer")}
                </Button>
              </form>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
