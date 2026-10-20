"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { TRACECART_API_URL } from "@/lib/apiBase";
import { Logo } from "@/components/common/Logo";
import { Card } from "@/components/ui/card/Card";
import Button from "@/components/ui/button/Button";
import { productPlaceholder } from "@/lib/placeholderImage";
import { PublicQuote } from "@/lib/types";

/** status 0 = the request never got a response (offline, DNS, CORS). */
class RequestError extends Error {
  constructor(public status: number) {
    super(`Request failed (${status})`);
  }
}

async function publicRequest<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${TRACECART_API_URL}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    throw new RequestError(0);
  }
  if (!res.ok) throw new RequestError(res.status);
  return (await res.json()) as T;
}

type LoadError = "notFound" | "rateLimited" | "unavailable";
type LoadState = { kind: "loading" } | { kind: "ready"; quote: PublicQuote } | { kind: "error"; reason: LoadError };

function loadErrorReason(err: unknown): LoadError {
  if (err instanceof RequestError && err.status === 404) return "notFound";
  if (err instanceof RequestError && err.status === 429) return "rateLimited";
  return "unavailable";
}

export default function PublicQuotePage() {
  const { token } = useParams<{ token: string }>();
  const t = useTranslations("quote");
  const locale = useLocale();

  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [deciding, setDeciding] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    publicRequest<PublicQuote>(`/q/${token}`).then(
      (quote) => !cancelled && setState({ kind: "ready", quote }),
      (err) => !cancelled && setState({ kind: "error", reason: loadErrorReason(err) })
    );
    return () => {
      cancelled = true;
    };
  }, [token, attempt]);

  function retry() {
    setState({ kind: "loading" });
    setAttempt((n) => n + 1);
  }

  // Shows the quote's current status; a failure here keeps what's on screen.
  async function refresh() {
    try {
      setState({ kind: "ready", quote: await publicRequest<PublicQuote>(`/q/${token}`) });
    } catch {
      /* keep the current view */
    }
  }

  async function decide(decision: "accept" | "decline") {
    setDeciding(true);
    setError(null);
    setNotice(null);
    try {
      await publicRequest(`/q/${token}/decision`, { method: "POST", body: JSON.stringify({ decision }) });
      if (decision === "accept") setAccepted(true);
      await refresh();
    } catch (err) {
      if (err instanceof RequestError && err.status === 409) {
        setNotice(t("errors.alreadyAnswered"));
        await refresh();
      } else if (err instanceof RequestError && err.status === 429) {
        setError(t("errors.rateLimited"));
      } else {
        setError(t("errors.decisionFailed"));
      }
    } finally {
      setDeciding(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Logo href={null} />
        </div>

        <Card className="shadow-[var(--shadow-2)]">
          {state.kind === "loading" && <p className="text-center text-sm text-ink-muted">{t("loading")}</p>}

          {state.kind === "error" && (
            <div className="text-center">
              <p className="text-sm text-ink-muted">{t(`errors.${state.reason}`)}</p>
              {state.reason !== "notFound" && (
                <Button variant="secondary" className="mt-4" onClick={retry}>
                  {t("retry")}
                </Button>
              )}
            </div>
          )}

          {state.kind === "ready" && (
            <QuoteDetails
              quote={state.quote}
              locale={locale}
              accepted={accepted}
              deciding={deciding}
              notice={notice}
              error={error}
              onDecide={decide}
            />
          )}
        </Card>
      </div>
    </div>
  );
}

function QuoteDetails({
  quote,
  locale,
  accepted,
  deciding,
  notice,
  error,
  onDecide,
}: {
  quote: PublicQuote;
  locale: string;
  accepted: boolean;
  deciding: boolean;
  notice: string | null;
  error: string | null;
  onDecide: (decision: "accept" | "decline") => void;
}) {
  const t = useTranslations("quote");
  // From this visit's click, or recorded earlier (after a reload or a second visit).
  const isAccepted = quote.status === "QUOTE_SENT" && (accepted || quote.quoteAcceptedAt != null);

  return (
    <div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={quote.productImageUrl || productPlaceholder(quote.reference)}
        alt=""
        className="mx-auto h-32 w-32 rounded-[var(--radius-s)] border border-line object-cover"
      />
      <p className="mt-4 text-center rb-overline">{quote.reference}</p>
      <h1 className="mt-1 text-center rb-title text-[18px]">
        {quote.productName} {quote.quantity > 1 ? `× ${quote.quantity}` : ""}
      </h1>
      <p className="mt-1 text-center text-sm text-ink-muted">{quote.route}</p>

      {quote.customerQuoteTotal != null && (
        <div className="mt-5 rounded-[var(--radius-s)] bg-accent-soft p-4 text-center">
          <p className="text-xs text-ink-muted">{t("total")}</p>
          <p className="text-2xl font-semibold text-accent-ink">
            {new Intl.NumberFormat(locale).format(quote.customerQuoteTotal)} {quote.currency}
          </p>
        </div>
      )}

      <p className="mt-4 text-center text-sm text-ink">
        {t("statusLine", { status: t(`status.${quote.status}`) })}
      </p>

      {notice && <p className="mt-3 text-center text-sm text-ink-muted">{notice}</p>}
      {error && (
        <p role="alert" className="mt-3 text-center text-sm text-critical">
          {error}
        </p>
      )}

      {isAccepted && (
        <p className="mt-4 rounded-[var(--radius-s)] bg-positive-soft px-3 py-2 text-center text-sm text-positive">
          {t("accepted")}
        </p>
      )}

      {quote.status === "QUOTE_SENT" && !isAccepted && (
        <div className="mt-5 flex gap-2">
          <Button variant="secondary" block onClick={() => onDecide("decline")} disabled={deciding}>
            {t("decline")}
          </Button>
          <Button block onClick={() => onDecide("accept")} loading={deciding}>
            {t("accept")}
          </Button>
        </div>
      )}

      {quote.status === "PAID" && <p className="mt-5 text-center text-sm text-positive">{t("paid")}</p>}

      {quote.status === "DECLINED" && <p className="mt-5 text-center text-sm text-ink-muted">{t("declined")}</p>}
    </div>
  );
}
