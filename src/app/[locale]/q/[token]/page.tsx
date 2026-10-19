"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { TRACECART_API_URL } from "@/lib/apiBase";
import { Logo } from "@/components/common/Logo";
import { Card } from "@/components/ui/card/Card";
import Button from "@/components/ui/button/Button";
import { productPlaceholder } from "@/lib/placeholderImage";
import { STATUS_LABELS, PublicQuote } from "@/lib/types";

async function publicRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${TRACECART_API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(data?.error?.message ?? "Une erreur est survenue");
  return data as T;
}

export default function PublicQuotePage() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [quote, setQuote] = useState<PublicQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [deciding, setDeciding] = useState(false);
  const [decisionResult, setDecisionResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const data = await publicRequest<PublicQuote>(`/q/${token}`);
      setQuote(data);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function decide(decision: "accept" | "decline") {
    setDeciding(true);
    setError(null);
    try {
      const result = await publicRequest<{ status: string; paymentInstructions?: string }>(`/q/${token}/decision`, {
        method: "POST",
        body: JSON.stringify({ decision }),
      });
      setDecisionResult(result.paymentInstructions ?? null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action impossible");
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
          {loading && <p className="text-center text-sm text-ink-muted">Chargement de votre devis...</p>}

          {notFound && !loading && (
            <p className="text-center text-sm text-ink-muted">
              Ce lien de devis est invalide ou a expiré.
            </p>
          )}

          {quote && (
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={quote.productImageUrl || productPlaceholder(quote.reference)}
                alt=""
                className="mx-auto h-32 w-32 rounded-[var(--radius-s)] border border-line object-cover"
              />
              <p className="mt-4 text-center sq-overline">{quote.reference}</p>
              <h1 className="mt-1 text-center sq-title text-[18px]">
                {quote.productName} {quote.quantity > 1 ? `× ${quote.quantity}` : ""}
              </h1>
              <p className="mt-1 text-center text-sm text-ink-muted">{quote.route}</p>

              {quote.customerQuoteTotal != null && (
                <div className="mt-5 rounded-[var(--radius-s)] bg-accent-soft p-4 text-center">
                  <p className="text-xs text-ink-muted">Total</p>
                  <p className="text-2xl font-semibold text-accent-ink">
                    {quote.customerQuoteTotal.toLocaleString("fr-FR")} {quote.currency}
                  </p>
                </div>
              )}

              <p className="mt-4 text-center text-sm text-ink">
                Statut : <span className="font-medium">{STATUS_LABELS[quote.status]}</span>
              </p>

              {error && <p className="mt-3 text-center text-sm text-critical">{error}</p>}

              {decisionResult && (
                <p className="mt-4 rounded-[var(--radius-s)] bg-positive-soft px-3 py-2 text-center text-sm text-positive">
                  {decisionResult}
                </p>
              )}

              {quote.status === "QUOTE_SENT" && !decisionResult && (
                <div className="mt-5 flex gap-2">
                  <Button variant="secondary" block onClick={() => decide("decline")} disabled={deciding}>
                    Refuser
                  </Button>
                  <Button block onClick={() => decide("accept")} loading={deciding}>
                    Accepter
                  </Button>
                </div>
              )}

              {quote.status === "PAID" && (
                <p className="mt-5 text-center text-sm text-positive">
                  Paiement confirmé — votre commande est en préparation.
                </p>
              )}

              {quote.status === "DECLINED" && (
                <p className="mt-5 text-center text-sm text-ink-muted">Vous avez refusé ce devis.</p>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
