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
  rating: number;
  title: string | null;
  body: string;
  createdAt: string;
  author: { name: string; email: string };
  product: { slug: string; title: string };
}

const TONE: Record<Status, "info" | "positive" | "critical"> = { PENDING: "info", APPROVED: "positive", REJECTED: "critical" };
const LIST_FILTERS = ["queue"] as const;

export function ReviewsList() {
  const t = useTranslations("reviews");
  const { applied, query, apply } = useListFilters(LIST_FILTERS);
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (filters: string) => {
    try {
      const res = await call<{ items: Row[] }>("GET", `/reviews${filters ? `?${filters}` : ""}`);
      setRows(res.items);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(query);
  }, [load, query]);

  async function decide(id: string, decision: "APPROVE" | "REJECT") {
    setError(null);
    try {
      const next = await call<Row>("POST", `/reviews/${id}/decide`, { decision });
      setRows((prev) => prev.map((r) => (r.id === id ? next : r)).filter((r) => (applied.queue === "toReview" ? r.status === "PENDING" : true)));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div>
      <h1 className="rb-headline mb-1 text-[28px]">{t("title")}</h1>
      <p className="mb-6 text-sm text-ink-muted">{t("lead")}</p>
      {applied.queue ? <QueueChip label={t("queues.toReview")} onClear={() => apply({ queue: "" })} /> : null}
      {error ? <p className="mb-4 text-sm text-critical">{error}</p> : null}
      {rows.length === 0 ? <p className="text-sm text-ink-muted">{t("empty")}</p> : null}
      <ul className="grid gap-3">
        {rows.map((r) => (
          <li key={r.id} className="rounded-[var(--radius-m)] border border-line bg-surface-raised p-5 text-sm">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge variant={TONE[r.status]}>{t(`statuses.${r.status}`)}</Badge>
              <span className="rb-numeral">{t("stars", { rating: r.rating })}</span>
              <Link href={`/p/${r.product.slug}`} className="font-medium underline">
                {r.product.title}
              </Link>
              <span className="text-ink-muted">{r.author.name}</span>
            </div>
            {r.title ? <p className="font-medium">{r.title}</p> : null}
            <p className="mt-1 text-ink">{r.body}</p>
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
          </li>
        ))}
      </ul>
    </div>
  );
}
