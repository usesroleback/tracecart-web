"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useFormat } from "@/lib/format";
import { toMajor } from "@/lib/currency";
import { Badge } from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { Field, input } from "@/components/ui/form/Form";
import { call } from "@/components/checkout/http";
import type { OrderView } from "@/components/checkout/types";
import { RETURN_TONE, type ReturnStatus } from "./Returns";

// A customer's side of returns (ADR-042): asking from an order, and following
// what they've asked for.

const box = "rounded-[var(--radius-m)] border border-line bg-surface-raised p-5";
const REASONS = ["DEFECTIVE", "DAMAGED", "WRONG_ITEM", "NOT_AS_DESCRIBED", "CHANGED_MIND"] as const;

interface MyReturn {
  reference: string;
  kind: "RETURN" | "WARRANTY";
  status: ReturnStatus;
  orderReference: string;
  externalRef: string | null;
  decisionNote: string | null;
  resolution: "REFUND" | "REPAIR" | "REPLACE" | "DECLINED" | null;
  warehouse: { name: string; city: string };
  lines: { sku: string; title: string; quantity: number; reason: string }[];
  photos: { id: string }[];
  refunds: { amountMinor: number; currency: string; paid: boolean }[];
  canCancel: boolean;
  canSend: boolean;
  createdAt: string;
}

/** On an order's page: its refunds, and asking to send back what was delivered. */
export function OrderReturns({ order, onChanged, boxClass }: { order: OrderView; onChanged: () => void; boxClass: string }) {
  const t = useTranslations("returns");
  const format = useFormat();
  const [open, setOpen] = useState(false);
  const refunds = order.refunds ?? [];
  const options = new Map((order.returnOptions ?? []).map((o) => [o.orderLineId, o]));
  const lines = order.lines.filter((l) => {
    const o = options.get(l.id);
    return o && (o.canReturn || o.canClaimWarranty);
  });
  if (!refunds.length && !lines.length) return null;
  return (
    <div className={boxClass}>
      {refunds.length ? (
        <>
          <h2 className="rb-label mb-2">{t("yourRefunds")}</h2>
          <ul className="mb-3 space-y-1 text-sm">
            {refunds.map((r) => (
              <li key={r.id}>
                <span className="rb-numeral">
                  {format.number(toMajor(r.amountMinor, r.currency))} {r.currency}
                </span>{" "}
                · {r.paid ? t("refundSent") : t("refundUnderway")}
                {r.creditNoteNumber ? (
                  <a href={`/api/tracecart/me/refunds/${r.id}/credit-note.pdf`} className="ml-2 underline">
                    {t("creditNote", { number: r.creditNoteNumber })}
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {lines.length ? (
        open ? (
          <ReturnForm order={order} lines={lines} options={options} onDone={onChanged} />
        ) : (
          <button type="button" onClick={() => setOpen(true)} className="text-sm font-medium text-ink underline">
            {t("sendBack")}
          </button>
        )
      ) : null}
      <Link href="/account/returns" className="mt-2 block text-sm text-ink-muted underline">
        {t("myReturns")}
      </Link>
    </div>
  );
}

function ReturnForm({ order, lines, options, onDone }: { order: OrderView; lines: OrderView["lines"]; options: Map<string, NonNullable<OrderView["returnOptions"]>[number]>; onDone: () => void }) {
  const t = useTranslations("returns");
  const format = useFormat();
  const canReturnAny = lines.some((l) => options.get(l.id)?.canReturn);
  const [kind, setKind] = useState<"RETURN" | "WARRANTY">(canReturnAny ? "RETURN" : "WARRANTY");
  const [picked, setPicked] = useState<Record<string, { quantity: number; reason: string } | undefined>>({});
  const [note, setNote] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const eligible = lines.filter((l) => (kind === "RETURN" ? options.get(l.id)?.canReturn : options.get(l.id)?.canClaimWarranty));
  const chosen = eligible.filter((l) => picked[l.id]);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const made = await call<MyReturn>("POST", "/me/returns", { orderReference: order.reference, kind, ...(note.trim() ? { note: note.trim() } : {}), lines: chosen.map((l) => ({ orderLineId: l.id, quantity: picked[l.id]!.quantity, reason: picked[l.id]!.reason })) }, { "Idempotency-Key": crypto.randomUUID() });
      if (files.length) {
        const form = new FormData();
        for (const f of files) form.append("photos", f);
        await call("POST", `/me/returns/${made.reference}/photos`, form);
      }
      onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      className="grid gap-3 text-sm"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <h2 className="rb-label">{t("sendBack")}</h2>
      <Field label={t("kindQuestion")} required>
        <select className={input} value={kind} onChange={(e) => setKind(e.target.value as "RETURN" | "WARRANTY")}>
          {canReturnAny ? <option value="RETURN">{t("kinds.RETURN")}</option> : null}
          {lines.some((l) => options.get(l.id)?.canClaimWarranty) ? <option value="WARRANTY">{t("kinds.WARRANTY")}</option> : null}
        </select>
      </Field>
      {eligible.map((l) => {
        const o = options.get(l.id)!;
        const until = kind === "RETURN" ? o.returnUntil : o.warrantyUntil;
        const p = picked[l.id];
        return (
          <fieldset key={l.id} className="grid gap-2 border-t border-line pt-2">
            <label className="flex items-start gap-2">
              <input type="checkbox" className="mt-1" checked={!!p} onChange={(e) => setPicked((prev) => ({ ...prev, [l.id]: e.target.checked ? { quantity: o.quantity, reason: kind === "WARRANTY" ? "DEFECTIVE" : "" } : undefined }))} />
              <span>
                {l.title}
                {until ? <span className="block text-xs text-ink-muted">{t("until", { date: format.shortDate(until) })}</span> : null}
              </span>
            </label>
            {p ? (
              <>
                {o.quantity > 1 ? (
                  <Field label={t("howMany")} required>
                    <input className={input} type="number" min={1} max={o.quantity} required value={p.quantity} onChange={(e) => setPicked((prev) => ({ ...prev, [l.id]: { ...p, quantity: Number(e.target.value) } }))} />
                  </Field>
                ) : null}
                {kind === "RETURN" ? (
                  <Field label={t("why")} required>
                    <select className={input} required value={p.reason} onChange={(e) => setPicked((prev) => ({ ...prev, [l.id]: { ...p, reason: e.target.value } }))}>
                      <option value="">{t("pick")}</option>
                      {REASONS.map((r) => (
                        <option key={r} value={r}>
                          {t(`reasons.${r}`)}
                        </option>
                      ))}
                    </select>
                  </Field>
                ) : null}
              </>
            ) : null}
          </fieldset>
        );
      })}
      <p className="text-ink-muted">{t("refundRule")}</p>
      <Field label={t("noteLabel")}>
        <textarea className={input} rows={2} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <Field label={t("photosLabel")} hint={t("photosHint")}>
        <input className={input} type="file" multiple accept="image/jpeg,image/png,image/webp,image/heic,image/heif" onChange={(e) => setFiles([...(e.target.files ?? [])].slice(0, 6))} />
      </Field>
      {error ? (
        <p role="alert" className="text-critical">
          {error}
        </p>
      ) : null}
      <Button type="submit" variant="primary" loading={busy} disabled={!chosen.length}>
        {t("sendRequest")}
      </Button>
    </form>
  );
}

/** The customer's returns, newest first, with what they can do next. */
export function MyReturnsList() {
  const t = useTranslations("returns");
  const format = useFormat();
  const { isLoaded, isSignedIn } = useAuth();
  const [items, setItems] = useState<MyReturn[] | null>(null);
  const [refs, setRefs] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await call<{ items: MyReturn[] }>("GET", "/me/returns");
    setItems(res.items);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isLoaded && isSignedIn) load().catch((e) => setError((e as Error).message));
  }, [isLoaded, isSignedIn, load]);

  async function act(path: string, body?: unknown) {
    setBusy(true);
    setError(null);
    try {
      await call("POST", `/me/returns/${path}`, body);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="rb-headline text-[28px] sm:text-[36px]">{t("myReturns")}</h1>
      {error ? (
        <p role="alert" className="text-critical">
          {error}
        </p>
      ) : null}
      {items?.length === 0 ? <p className="text-ink-muted">{t("noReturns")}</p> : null}
      {items?.map((r) => (
        <div key={r.reference} className={`${box} text-sm`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="rb-mono-s text-ink-muted">
              {r.reference} ·{" "}
              <Link href={`/account/orders/${r.orderReference}`} className="underline">
                {r.orderReference}
              </Link>
            </p>
            <Badge variant={RETURN_TONE[r.status]}>{t(`statuses.${r.status}`)}</Badge>
          </div>
          <p className="mt-1 text-ink-muted">
            {t(`kinds.${r.kind}`)} · {format.shortDate(r.createdAt)}
          </p>
          <ul className="mt-2">
            {r.lines.map((l) => (
              <li key={l.sku}>
                {l.title} × {l.quantity}
              </li>
            ))}
          </ul>
          {r.decisionNote ? <p className="mt-2">{r.decisionNote}</p> : null}
          {r.resolution ? <p className="mt-2 font-medium">{t(`resolutions.${r.resolution}`)}</p> : null}
          {r.refunds.map((x, i) => (
            <p key={i} className="mt-1">
              <span className="rb-numeral">
                {format.number(toMajor(x.amountMinor, x.currency))} {x.currency}
              </span>{" "}
              · {x.paid ? t("refundSent") : t("refundUnderway")}
            </p>
          ))}
          {r.canSend ? (
            <form
              className="mt-3 grid max-w-md gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const ref = (refs[r.reference] ?? "").trim();
                act(`${r.reference}/sent`, ref ? { externalRef: ref } : {});
              }}
            >
              <p>{t("sendTo", { warehouse: `${r.warehouse.name}, ${r.warehouse.city}` })}</p>
              <Field label={t("trackingRef")}>
                <input className={input} maxLength={120} value={refs[r.reference] ?? ""} onChange={(e) => setRefs((prev) => ({ ...prev, [r.reference]: e.target.value }))} />
              </Field>
              <Button type="submit" variant="primary" loading={busy}>
                {t("iSentIt")}
              </Button>
            </form>
          ) : null}
          {r.canCancel ? (
            <button type="button" disabled={busy} onClick={() => act(`${r.reference}/cancel`)} className="mt-3 block text-ink-muted underline">
              {t("withdraw")}
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
}
