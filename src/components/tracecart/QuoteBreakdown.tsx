"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { api } from "@/lib/apiClient";
import { Badge } from "@/components/ui/badge/Badge";
import { Card } from "@/components/ui/card/Card";
import { CustomerQuote, Order, PricedQuote, QuoteLine, QuoteNote } from "@/lib/types";
import { useFormat } from "@/lib/format";
import { useQuoteNote } from "@/lib/quoteNotes";

const PREVIEW_STATUSES = new Set(["QUOTING", "QUOTED"]);

/**
 * The customer quote, as the administrateur sees it: before sending, what it
 * would be if sent now (every line, Tracecart's or passed on, confirmed or
 * estimated, and the rule version behind it); after, each version as it was sent.
 */
export function QuoteBreakdown({ order }: { order: Order }) {
  const t = useTranslations("orders");
  const [preview, setPreview] = useState<PricedQuote | null>(null);
  const [failed, setFailed] = useState(false);
  const wantsPreview = PREVIEW_STATUSES.has(order.status) && !!order.logisticsQuote;

  useEffect(() => {
    if (!wantsPreview) return;
    let cancelled = false;
    api.get<PricedQuote>(`/orders/${order.id}/quote-preview`).then(
      (q) => {
        if (cancelled) return;
        setPreview(q);
        setFailed(false);
      },
      () => !cancelled && setFailed(true),
    );
    return () => {
      cancelled = true;
    };
  }, [order.id, order.updatedAt, wantsPreview]);

  const versions = order.customerQuotes ?? [];
  if (!wantsPreview && versions.length === 0) return null;

  return (
    <Card padding={24}>
      <h2 className="rb-title">{t("quoteBreakdown.title")}</h2>
      {wantsPreview && (
        <div className="mt-3">
          <p className="rb-overline">{t("quoteBreakdown.preview")}</p>
          {failed ? (
            <p className="mt-2 text-sm text-critical">{t("quoteBreakdown.previewFailed")}</p>
          ) : (
            preview && <Lines lines={preview.lines} notes={preview.notes} total={preview.total} currency={preview.currency} provisional={preview.provisional} />
          )}
        </div>
      )}
      {versions.length > 0 && (
        <div className="mt-5">
          <p className="rb-overline">{t("quoteBreakdown.versions")}</p>
          <ol className="mt-2 grid gap-2">
            {versions.map((q, i) => (
              <Version key={q.id} quote={q} open={i === 0 && !wantsPreview} />
            ))}
          </ol>
        </div>
      )}
    </Card>
  );
}

function Version({ quote, open }: { quote: CustomerQuote; open: boolean }) {
  const t = useTranslations("orders");
  const tl = useTranslations("labels");
  const f = useFormat();
  const variant = quote.status === "ACCEPTED" ? "positive" : quote.status === "DECLINED" || quote.status === "EXPIRED" ? "critical" : quote.status === "SENT" ? "info" : "outline";
  return (
    <li>
      <details open={open} className="rounded-[var(--radius-s)] border border-line">
        <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
          <span className="font-semibold text-ink">{t("quoteBreakdown.version", { version: quote.version })}</span>
          <span className="flex items-center gap-2">
            <span className="tabular-nums">{f.money(quote.total, quote.currency)}</span>
            <Badge variant={variant}>{tl(`quoteStatus.${quote.status}`)}</Badge>
          </span>
        </summary>
        <div className="border-t border-line px-3 pb-3">
          <p className="mt-2 text-[13px] text-ink-muted">
            {f.dayTime(quote.createdAt)} · {t("quoteBreakdown.validUntil", { when: f.date(quote.validUntil) })}
          </p>
          <Lines lines={quote.lineItems} notes={quote.notes} total={quote.total} currency={quote.currency} provisional={quote.provisional} />
        </div>
      </details>
    </li>
  );
}

function Lines({ lines, notes, total, currency, provisional }: { lines: QuoteLine[]; notes: QuoteNote[]; total: number; currency: string; provisional: boolean }) {
  const t = useTranslations("orders");
  const tl = useTranslations("labels");
  const f = useFormat();
  const noteText = useQuoteNote();
  return (
    <div>
      <table className="mt-2 w-full border-separate border-spacing-0 text-sm leading-5">
        <caption className="sr-only">{t("quoteBreakdown.caption")}</caption>
        <tbody>
          {lines.map((l, i) => (
            <tr key={`${l.component}-${i}`}>
              <th scope="row" className="border-b border-line py-2 pr-3 text-left font-normal">
                <span className="text-ink">{tl(`priceComponent.${l.component}`)}</span>
                <span className="mt-0.5 flex flex-wrap gap-1">
                  <Badge variant={l.revenue ? "accent" : "outline"}>{t(l.revenue ? "quoteBreakdown.revenue" : "quoteBreakdown.passThrough")}</Badge>
                  {l.basis === "ESTIMATED" && <Badge variant="attn">{tl("basis.ESTIMATED")}</Badge>}
                  {l.rule && <span className="rb-mono text-xs text-ink-muted">{t("quoteBreakdown.rule", { code: l.rule.code, version: l.rule.version })}</span>}
                </span>
              </th>
              <td className="border-b border-line py-2 text-right align-top tabular-nums">{f.money(l.amount, currency)}</td>
            </tr>
          ))}
          <tr>
            <th scope="row" className="py-2.5 pr-3 text-left font-semibold">
              {t("quoteBreakdown.total")} {provisional && <Badge variant="attn">{t("quoteBreakdown.provisional")}</Badge>}
            </th>
            <td className="py-2.5 text-right text-base font-semibold tabular-nums">{f.money(total, currency)}</td>
          </tr>
        </tbody>
      </table>
      {notes.length > 0 && (
        <div className="mt-2">
          <p className="text-xs font-semibold uppercase tracking-[0.04em] text-ink-muted">{t("quoteBreakdown.notes")}</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-[13px] text-ink-muted">
            {notes.map((n, i) => (
              <li key={i}>{noteText(n)}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
