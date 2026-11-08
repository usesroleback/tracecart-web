"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { api } from "@/lib/apiClient";
import Button from "@/components/ui/button/Button";
import { Badge } from "@/components/ui/badge/Badge";
import { Field, input } from "@/components/ui/form/Form";
import { toMajor, toMinor } from "@/lib/currency";

const CURRENCY = "XOF";

interface Card {
  id: string;
  last4: string;
  initialMinor: number;
  balanceMinor: number;
  currency: string;
  status: "ACTIVE" | "DISABLED";
  expiresAt: string | null;
  recipientEmail: string | null;
  recipientName: string | null;
  createdAt: string;
}

const empty = { amount: "", recipientEmail: "", recipientName: "", message: "", expiresAt: "" };

/** Gift cards (ADR-071): issued here, spent by customers at checkout. */
export function GiftCardsAdmin() {
  const t = useTranslations("promotions.giftCards");
  const format = useFormatter();
  const [cards, setCards] = useState<Card[]>([]);
  const [f, setF] = useState(empty);
  const [issued, setIssued] = useState<{ code: string; amountMinor: number; emailed: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setCards((await api.get<{ giftCards: Card[] }>("/gift-cards")).giftCards);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const money = (minor: number, currency = CURRENCY) => `${format.number(toMajor(minor, currency))} ${currency}`;

  async function issue(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const amountMinor = toMinor(f.amount, CURRENCY);
    if (!amountMinor) return setError(t("badAmount"));
    setBusy(true);
    try {
      const card = await api.post<Card & { code: string }>("/gift-cards", {
        amountMinor,
        ...(f.recipientEmail.trim() ? { recipientEmail: f.recipientEmail.trim() } : {}),
        ...(f.recipientName.trim() ? { recipientName: f.recipientName.trim() } : {}),
        ...(f.message.trim() ? { message: f.message.trim() } : {}),
        ...(f.expiresAt ? { expiresAt: new Date(`${f.expiresAt}T23:59:59`).toISOString() } : {}),
      });
      setIssued({ code: card.code, amountMinor: card.initialMinor, emailed: !!card.recipientEmail });
      setF(empty);
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(id: string, status: Card["status"]) {
    setError(null);
    try {
      await api.patch(`/gift-cards/${id}`, { status });
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="rb-headline text-[28px]">{t("title")}</h1>
        <p className="mt-1 text-sm text-ink-muted">{t("lead")}</p>
      </div>
      <form onSubmit={issue} className="grid gap-3 rounded-[var(--radius-m)] border border-line bg-surface-raised p-4 sm:grid-cols-3">
        <Field label={t("amount", { currency: CURRENCY })}>
          <input className={input} inputMode="decimal" value={f.amount} onChange={(e) => setF((x) => ({ ...x, amount: e.target.value }))} required />
        </Field>
        <Field label={t("recipientEmail")} hint={t("recipientEmailHint")}>
          <input className={input} type="email" value={f.recipientEmail} onChange={(e) => setF((x) => ({ ...x, recipientEmail: e.target.value }))} />
        </Field>
        <Field label={t("recipientName")}>
          <input className={input} value={f.recipientName} maxLength={120} onChange={(e) => setF((x) => ({ ...x, recipientName: e.target.value }))} />
        </Field>
        <Field label={t("message")} className="sm:col-span-2">
          <input className={input} value={f.message} maxLength={300} onChange={(e) => setF((x) => ({ ...x, message: e.target.value }))} />
        </Field>
        <Field label={t("expiresAt")} hint={t("expiresAtHint")}>
          <input className={input} type="date" value={f.expiresAt} onChange={(e) => setF((x) => ({ ...x, expiresAt: e.target.value }))} />
        </Field>
        <div className="flex items-end sm:col-span-3">
          <Button type="submit" variant="primary" disabled={busy}>
            {t("issue")}
          </Button>
        </div>
      </form>
      {issued ? (
        <div role="status" className="rounded-[var(--radius-m)] border border-ink bg-surface-raised p-4">
          <p className="text-sm">{t("issued", { amount: money(issued.amountMinor) })}</p>
          <p className="rb-mono-s mt-2 select-all text-[22px] tracking-[0.12em]">{issued.code}</p>
          <p className="mt-2 text-sm text-ink-muted">{issued.emailed ? t("issuedEmailed") : t("issuedOnce")}</p>
        </div>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-critical">
          {error}
        </p>
      ) : null}
      {!cards.length ? <p className="text-sm text-ink-muted">{t("empty")}</p> : null}
      <ul className="divide-y divide-line rounded-[var(--radius-m)] border border-line bg-surface-raised">
        {cards.map((c) => (
          <li key={c.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
            <span className="rb-mono-s font-medium">····{c.last4}</span>
            <span className="rb-numeral font-medium">{t("balance", { left: money(c.balanceMinor, c.currency), of: money(c.initialMinor, c.currency) })}</span>
            {c.recipientEmail ? <span className="text-ink-muted">{c.recipientName ? `${c.recipientName} · ` : ""}{c.recipientEmail}</span> : null}
            {c.expiresAt ? <span className="text-ink-muted">{t("until", { date: format.dateTime(new Date(c.expiresAt), { dateStyle: "medium" }) })}</span> : null}
            <Badge variant={c.status === "ACTIVE" ? "positive" : "default"}>{t(`statuses.${c.status}`)}</Badge>
            <Button type="button" variant="secondary" size="s" onClick={() => setStatus(c.id, c.status === "ACTIVE" ? "DISABLED" : "ACTIVE")}>
              {c.status === "ACTIVE" ? t("disable") : t("enable")}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
