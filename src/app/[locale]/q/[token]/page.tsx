"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { TRACECART_API_URL } from "@/lib/apiBase";
import { Logo } from "@/components/common/Logo";
import { Card } from "@/components/ui/card/Card";
import Button from "@/components/ui/button/Button";
import { productPlaceholder } from "@/lib/placeholderImage";
import { Alert } from "@/components/ui/alert/Alert";
import { Status, orderStatusState } from "@/components/ui/status/Status";
import { RouteTimeline, orderRouteSteps } from "@/components/tracecart/RouteTimeline";
import { useFormat } from "@/lib/format";
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
    <div className="min-h-screen bg-surface">
      <header className="border-b border-line bg-surface-raised">
        <div className="mx-auto flex h-16 max-w-4xl items-center px-4 sm:px-6">
          <Logo variant="lockup" height={22} href={null} />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
        {state.kind === "loading" && <p className="text-center text-sm text-ink-muted">{t("loading")}</p>}

        {state.kind === "error" && (
          <Card className="mx-auto max-w-md text-center">
            <p className="text-sm text-ink-muted">{t(`errors.${state.reason}`)}</p>
            {state.reason !== "notFound" && (
              <Button variant="secondary" className="mt-4" onClick={retry}>
                {t("retry")}
              </Button>
            )}
          </Card>
        )}

        {state.kind === "ready" && (
          <Tracking quote={state.quote}>
            <QuoteDetails
              quote={state.quote}
              locale={locale}
              accepted={accepted}
              deciding={deciding}
              notice={notice}
              error={error}
              onDecide={decide}
            />
          </Tracking>
        )}
      </main>
    </div>
  );
}

/**
 * The customer's view of their order (TraceCartSite "Track"): the route as
 * the headline, its status in shape + word, the route timeline, then the
 * quote and where the carrier last reported the parcel. No costs, names or
 * internal notes reach this page (serializeOrderForCustomer).
 */
function Tracking({ quote, children }: { quote: PublicQuote; children: React.ReactNode }) {
  const t = useTranslations("quote");
  const to = useTranslations("orders");
  const f = useFormat();
  const steps = orderRouteSteps(
    {
      status: quote.status,
      intakeType: quote.intakeType,
      destinationCity: quote.destinationCity,
      provider: quote.sourceName ? { name: quote.sourceName } : null,
      hub: { city: quote.hubCity },
    },
    quote.history,
    to,
    f,
  );
  const deliveredAt = [...quote.history].reverse().find((h) => h.toStatus === "DELIVERED")?.createdAt;

  return (
    <div>
      <p className="rb-mono text-ink-muted">{quote.reference}</p>
      <h1 className="rb-display rb-display-l mt-2">
        {quote.hubCity} → {quote.destinationCity}
      </h1>
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
        <Status state={orderStatusState(quote.status)} label={t(`status.${quote.status}`)} />
        <span className="text-sm text-ink-muted">{t("tracking.updated", { when: f.dayTime(quote.updatedAt) })}</span>
      </div>

      <Card route padding={32} className="mt-6">
        <RouteTimeline animate steps={steps} label={to("route.labelFor", { reference: quote.reference })} />
      </Card>

      <div className="mt-4 grid gap-3" aria-live="polite">
        {quote.status === "DELIVERED" && (
          <Alert tone="positive" title={t("tracking.delivered", { city: quote.destinationCity })}>
            {deliveredAt && t("tracking.deliveredOn", { when: f.dayTime(deliveredAt) })}
          </Alert>
        )}
        {quote.status === "UNAVAILABLE" && (
          <Alert tone="critical" title={t("tracking.unavailable")}>
            {t("tracking.contact")}
          </Alert>
        )}
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2 md:items-start">
        <Card padding={24}>
          <h2 className="rb-title">{t("tracking.yourOrder")}</h2>
          <div className="mt-4">{children}</div>
        </Card>
        <Card padding={24}>
          <h2 className="rb-title">{t("tracking.positions")}</h2>
          {quote.positions.length === 0 ? (
            <p className="mt-3 text-sm text-ink-muted">{t("tracking.noPositions")}</p>
          ) : (
            <ol className="mt-3 grid">
              {quote.positions.map((p) => (
                <li key={p.id} className="flex items-baseline justify-between gap-3 border-b border-line py-2.5 last:border-b-0">
                  <span className="font-semibold text-ink">{p.city}</span>
                  <span className="rb-mono text-xs text-ink-muted">{f.dayTime(p.recordedAt)}</span>
                </li>
              ))}
            </ol>
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
      <div className="flex items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={quote.productImageUrl || productPlaceholder(quote.reference)}
          alt=""
          className="h-16 w-16 flex-none rounded-[var(--radius-s)] border border-line object-cover"
        />
        <p className="font-semibold text-ink">
          {quote.productName}
          {quote.quantity > 1 ? ` × ${new Intl.NumberFormat(locale).format(quote.quantity)}` : ""}
        </p>
      </div>

      {quote.customerQuoteTotal != null && (
        <div className="mt-4 flex items-baseline justify-between gap-3 rounded-[var(--radius-s)] bg-surface-sunken px-4 py-3">
          <span className="text-sm text-ink-muted">{t("total")}</span>
          <span className="text-xl font-semibold tabular-nums text-ink">
            {new Intl.NumberFormat(locale).format(quote.customerQuoteTotal)} {quote.currency}
          </span>
        </div>
      )}

      {notice && <p className="mt-3 text-sm text-ink-muted">{notice}</p>}
      {error && (
        <p role="alert" className="mt-3 text-sm text-critical">
          {error}
        </p>
      )}

      {isAccepted && (
        <p className="mt-4 rounded-[var(--radius-s)] bg-positive-soft px-3 py-2 text-sm text-positive">
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

      {quote.status === "PAID" && <p className="mt-4 text-sm text-positive">{t("paid")}</p>}

      {quote.status === "DECLINED" && <p className="mt-4 text-sm text-ink-muted">{t("declined")}</p>}
    </div>
  );
}
