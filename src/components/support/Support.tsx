"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useFormat } from "@/lib/format";
import { toMajor } from "@/lib/currency";
import { Badge } from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { Field, input } from "@/components/ui/form/Form";
import { call } from "@/components/checkout/http";

// Support cases (ADR-094), for customers and for staff.

const box = "rounded-[var(--radius-m)] border border-line bg-surface-raised p-5 text-sm";
type Status = "OPEN" | "WAITING_CUSTOMER" | "RESOLVED" | "CLOSED";
const TONE: Record<Status, "attn" | "info" | "positive" | "default"> = { OPEN: "attn", WAITING_CUSTOMER: "info", RESOLVED: "positive", CLOSED: "default" };

interface Mine {
  id: string;
  reference: string;
  subject: string;
  status: Status;
  orderReference: string | null;
  messages: { id: string; fromStaff: boolean; body: string; createdAt: string }[];
}

export function MySupport() {
  const t = useTranslations("team.support");
  const format = useFormat();
  const [items, setItems] = useState<Mine[] | null>(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [order, setOrder] = useState("");
  const [replies, setReplies] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => setItems((await call<{ items: Mine[] }>("GET", "/me/support")).items), []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load().catch((e) => setError((e as Error).message));
  }, [load]);

  async function act(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await load();
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <h1 className="rb-headline text-[28px]">{t("mine")}</h1>
      {error ? <p role="alert" className="text-sm text-critical">{error}</p> : null}
      <form
        className={`${box} grid gap-3`}
        onSubmit={async (e) => {
          e.preventDefault();
          if (await act(() => call("POST", "/me/support", { subject: subject.trim(), message: message.trim(), ...(order.trim() ? { orderReference: order.trim() } : {}) }))) {
            setSubject("");
            setMessage("");
            setOrder("");
          }
        }}
      >
        <h2 className="rb-title">{t("ask")}</h2>
        <Field label={t("subject")} required>
          <input className={input} required minLength={3} maxLength={160} value={subject} onChange={(e) => setSubject(e.target.value)} />
        </Field>
        <Field label={t("orderReference")}>
          <input className={input} maxLength={40} value={order} onChange={(e) => setOrder(e.target.value)} />
        </Field>
        <Field label={t("message")} required>
          <textarea className={input} required minLength={3} maxLength={4000} rows={4} value={message} onChange={(e) => setMessage(e.target.value)} />
        </Field>
        <Button type="submit" variant="primary" loading={busy}>
          {t("send")}
        </Button>
      </form>
      {items && !items.length ? <p className="text-sm text-ink-muted">{t("noneMine")}</p> : null}
      {items?.map((c) => (
        <article key={c.id} className={box}>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-medium">{c.subject}</h2>
            <Badge variant={TONE[c.status]}>{t(`statuses.${c.status}`)}</Badge>
          </div>
          <p className="rb-mono-s mb-2 text-ink-muted">
            {c.reference}
            {c.orderReference ? ` · ${c.orderReference}` : ""}
          </p>
          <ul className="flex flex-col gap-2">
            {c.messages.map((m) => (
              <li key={m.id} className={m.fromStaff ? "rounded-[var(--radius-s)] bg-surface-sunken p-2" : "p-2"}>
                <p className="text-xs text-ink-muted">
                  {m.fromStaff ? "Tracecart" : t("you")} · {format.dayTime(m.createdAt)}
                </p>
                <p className="whitespace-pre-line">{m.body}</p>
              </li>
            ))}
          </ul>
          {c.status !== "CLOSED" ? (
            <div className="mt-3 flex gap-2">
              <input className={input} aria-label={t("answer")} placeholder={t("answer")} maxLength={4000} value={replies[c.id] ?? ""} onChange={(e) => setReplies({ ...replies, [c.id]: e.target.value })} />
              <Button
                variant="secondary"
                loading={busy}
                disabled={!(replies[c.id] ?? "").trim()}
                onClick={async () => {
                  if (await act(() => call("POST", `/me/support/${c.id}/messages`, { body: replies[c.id].trim() }))) setReplies({ ...replies, [c.id]: "" });
                }}
              >
                {t("send")}
              </Button>
            </div>
          ) : null}
        </article>
      ))}
    </div>
  );
}

interface StaffCase {
  id: string;
  reference: string;
  subject: string;
  status: Status;
  customer: { name: string; email: string; phone: string | null };
  assignee: { id: string; name: string } | null;
  order: { id: string; reference: string } | null;
  messages: { id: string; fromStaff: boolean; internal: boolean; author: string; body: string; createdAt: string }[];
}

export function SupportDesk({ canWrite, myId }: { canWrite: boolean; myId: string }) {
  const t = useTranslations("team.support");
  const format = useFormat();
  const [status, setStatus] = useState<Status | "">("OPEN");
  const [items, setItems] = useState<StaffCase[] | null>(null);
  const [text, setText] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => setItems((await call<{ items: StaffCase[] }>("GET", `/support/cases${status ? `?status=${status}` : ""}`)).items), [status]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load().catch((e) => setError((e as Error).message));
  }, [load]);

  async function act(id: string, path: string, body: unknown, clear = true) {
    setBusy(true);
    setError(null);
    try {
      await call("POST", `/support/cases/${id}/${path}`, body);
      if (clear) setText({ ...text, [id]: "" });
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex max-w-4xl flex-col gap-4">
      <div>
        <h1 className="rb-headline mb-1 text-[28px]">{t("desk")}</h1>
        <p className="text-sm text-ink-muted">{t("deskLead")}</p>
      </div>
      <div className="max-w-xs">
        <Field label={t("status")}>
          <select className={input} value={status} onChange={(e) => setStatus(e.target.value as Status | "")}>
            <option value="">{t("all")}</option>
            {(["OPEN", "WAITING_CUSTOMER", "RESOLVED", "CLOSED"] as Status[]).map((s) => (
              <option key={s} value={s}>
                {t(`statuses.${s}`)}
              </option>
            ))}
          </select>
        </Field>
      </div>
      {error ? <p role="alert" className="text-sm text-critical">{error}</p> : null}
      {items && !items.length ? <p className="text-sm text-ink-muted">{t("none")}</p> : null}
      {items?.map((c) => {
        const body = (text[c.id] ?? "").trim();
        return (
          <article key={c.id} className={box}>
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-medium">{c.subject}</h2>
              <Badge variant={TONE[c.status]}>{t(`statuses.${c.status}`)}</Badge>
            </div>
            <p className="mb-2 text-ink-muted">
              <span className="rb-mono-s">{c.reference}</span> · {c.customer.name} · {c.customer.email}
              {c.customer.phone ? ` · ${c.customer.phone}` : ""}
              {c.order ? (
                <>
                  {" · "}
                  <Link className="underline" href={`/store-orders/${c.order.id}`}>
                    {c.order.reference}
                  </Link>
                </>
              ) : null}
              {c.assignee ? ` · ${t("assigned", { name: c.assignee.name })}` : ""}
            </p>
            <ul className="flex flex-col gap-2">
              {c.messages.map((m) => (
                <li key={m.id} className={m.internal ? "rounded-[var(--radius-s)] border border-dashed border-line p-2" : m.fromStaff ? "rounded-[var(--radius-s)] bg-surface-sunken p-2" : "p-2"}>
                  <p className="text-xs text-ink-muted">
                    {m.author} · {format.dayTime(m.createdAt)}
                    {m.internal ? ` · ${t("internal")}` : ""}
                  </p>
                  <p className="whitespace-pre-line">{m.body}</p>
                </li>
              ))}
            </ul>
            {canWrite && c.status !== "CLOSED" ? (
              <div className="mt-3 grid gap-2">
                <textarea className={input} rows={3} aria-label={t("answer")} placeholder={t("answer")} maxLength={4000} value={text[c.id] ?? ""} onChange={(e) => setText({ ...text, [c.id]: e.target.value })} />
                <div className="flex flex-wrap gap-2">
                  <Button size="s" variant="primary" loading={busy} disabled={!body} onClick={() => act(c.id, "reply", { body })}>
                    {t("reply")}
                  </Button>
                  <Button size="s" variant="secondary" loading={busy} disabled={!body} onClick={() => act(c.id, "reply", { body, internal: true })}>
                    {t("note")}
                  </Button>
                  <Button size="s" variant="secondary" loading={busy} disabled={body.length < 3 || c.status === "RESOLVED"} onClick={() => act(c.id, "resolve", { resolution: body })}>
                    {t("resolve")}
                  </Button>
                  {c.assignee?.id !== myId ? (
                    <Button size="s" variant="secondary" loading={busy} onClick={() => act(c.id, "assign", { assigneeId: myId }, false)}>
                      {t("takeIt")}
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}

/** Figures from the API, one card each. */
function Cards({ entries }: { entries: [string, string | number][] }) {
  return (
    <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {entries.map(([k, v]) => (
        <div key={k} className={box}>
          <dt className="rb-label">{k}</dt>
          <dd className="rb-numeral text-lg">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function useMoneyText() {
  const format = useFormat();
  return (rows: { currency: string; amountMinor: number }[]) => rows.map((r) => `${format.number(toMajor(r.amountMinor, r.currency))} ${r.currency}`).join(" + ") || "0";
}

interface SellerBoard {
  orders: Record<string, number>;
  sales: { currency: string; amountMinor: number }[];
  topProducts: { sku: string; title: Record<string, string>; quantity: number }[];
}

export function SellerDashboard({ locale }: { locale: string }) {
  const t = useTranslations("team.boards");
  const money = useMoneyText();
  const [d, setD] = useState<SellerBoard | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    call<SellerBoard>("GET", "/seller/dashboard").then(setD).catch((e) => setError((e as Error).message));
  }, []);
  if (error) return <p role="alert" className="mb-4 text-sm text-critical">{error}</p>;
  if (!d) return null;
  return (
    <section className="mb-6 flex flex-col gap-3">
      <Cards entries={[[t("sales30"), money(d.sales)], ...Object.entries(d.orders).map(([k, v]): [string, number] => [t(`seller.${k}`), v])]} />
      {d.topProducts.length ? (
        <div className={box}>
          <h2 className="rb-label mb-2">{t("topProducts")}</h2>
          <ul>
            {d.topProducts.map((p) => (
              <li key={p.sku} className="flex justify-between gap-3">
                <span>{p.title[locale] ?? p.title.fr ?? p.sku}</span>
                <span className="rb-numeral">{p.quantity}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

interface PartnerBoard {
  work: Record<string, number>;
  cashToRemit: { currency: string; amountMinor: number }[];
  owedToYou: { currency: string; amountMinor: number }[];
}

export function PartnerDashboard() {
  const t = useTranslations("team.boards");
  const money = useMoneyText();
  const [d, setD] = useState<PartnerBoard | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    call<PartnerBoard>("GET", "/partner/dashboard").then(setD).catch((e) => setError((e as Error).message));
  }, []);
  if (error) return <p role="alert" className="mb-4 text-sm text-critical">{error}</p>;
  if (!d) return null;
  return (
    <section className="mb-6">
      <Cards entries={[...Object.entries(d.work).map(([k, v]): [string, number] => [t(`partner.${k}`), v]), [t("cashToRemit"), money(d.cashToRemit)], [t("owedToYou"), money(d.owedToYou)]]} />
    </section>
  );
}
