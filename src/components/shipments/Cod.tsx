"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useFormat } from "@/lib/format";
import { toMajor, toMinor } from "@/lib/currency";
import { Badge } from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { Field, input } from "@/components/ui/form/Form";
import { call } from "@/components/checkout/http";

// Cash taken on delivery (ADR-041): what a company still holds, its declarations
// that it has passed the cash on, and finance's answer. The API scopes both lists.

interface Collection {
  id: string;
  shipmentReference: string;
  orderReference: string;
  amountMinor: number;
  currency: string;
  holder: { id: string; name: string } | null;
  collectedAt: string;
}

type RemittanceStatus = "DECLARED" | "CONFIRMED" | "REJECTED";

interface Remittance {
  id: string;
  reference: string;
  status: RemittanceStatus;
  holder: { id: string; name: string } | null;
  amountMinor: number;
  currency: string;
  transferRef: string | null;
  note: string | null;
  declaredAt: string;
  decisionNote: string | null;
  collections: { id: string; shipmentReference: string; amountMinor: number }[];
}

const TONE: Record<RemittanceStatus, "attn" | "positive" | "critical"> = { DECLARED: "attn", CONFIRMED: "positive", REJECTED: "critical" };
const box = "rounded-[var(--radius-m)] border border-line bg-surface-raised p-5 text-sm";

export function CodCash({ canDeclare, canDecide }: { canDeclare: boolean; canDecide: boolean }) {
  const t = useTranslations("cod");
  const format = useFormat();
  const [held, setHeld] = useState<Collection[]>([]);
  const [remittances, setRemittances] = useState<Remittance[]>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [transferRef, setTransferRef] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const money = (minor: number, currency: string) => `${format.number(toMajor(minor, currency))} ${currency}`;

  const load = useCallback(async () => {
    const [c, r] = await Promise.all([call<{ items: Collection[] }>("GET", "/cod/collections?limit=200"), call<{ items: Remittance[] }>("GET", "/cod/remittances")]);
    setHeld(c.items);
    setRemittances(r.items);
  }, []);

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
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const chosen = held.filter((c) => picked.has(c.id));
  const declare = () =>
    act(async () => {
      await call("POST", "/cod/remittances", { collectionIds: chosen.map((c) => c.id), ...(transferRef.trim() ? { transferRef: transferRef.trim() } : {}) });
      setPicked(new Set());
      setTransferRef("");
    });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="rb-headline mb-1 text-[28px]">{t("title")}</h1>
        <p className="text-sm text-ink-muted">{t("lead")}</p>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-critical">
          {error}
        </p>
      ) : null}

      <section className={box}>
        <h2 className="rb-title mb-3">{t("held")}</h2>
        {held.length ? (
          <table className="w-full text-left">
            <thead className="text-ink-muted">
              <tr>
                {canDeclare ? <th className="py-2" aria-label={t("pick")} /> : null}
                <th className="py-2 font-medium">{t("columns.shipment")}</th>
                <th className="py-2 font-medium">{t("columns.holder")}</th>
                <th className="py-2 font-medium">{t("columns.collectedAt")}</th>
                <th className="py-2 text-right font-medium">{t("columns.amount")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {held.map((c) => (
                <tr key={c.id}>
                  {canDeclare ? (
                    <td className="py-2 pr-2">
                      <input
                        type="checkbox"
                        aria-label={t("pickOne", { reference: c.shipmentReference })}
                        checked={picked.has(c.id)}
                        onChange={(e) => {
                          const next = new Set(picked);
                          if (e.target.checked) next.add(c.id);
                          else next.delete(c.id);
                          setPicked(next);
                        }}
                      />
                    </td>
                  ) : null}
                  <td className="rb-mono-s py-2">{c.shipmentReference}</td>
                  <td className="py-2">{c.holder?.name ?? t("tracecart")}</td>
                  <td className="py-2 text-ink-muted">{format.shortDate(c.collectedAt)}</td>
                  <td className="rb-numeral py-2 text-right">{money(c.amountMinor, c.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-ink-muted">{t("noneHeld")}</p>
        )}
        {canDeclare && chosen.length ? (
          <form
            className="mt-4 grid max-w-md gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              declare();
            }}
          >
            <p className="font-medium">{[...new Set(chosen.map((c) => c.currency))].map((cur) => money(chosen.filter((c) => c.currency === cur).reduce((n, c) => n + c.amountMinor, 0), cur)).join(" + ")}</p>
            <Field label={t("transferRef")}>
              <input className={input} maxLength={120} value={transferRef} onChange={(e) => setTransferRef(e.target.value)} />
            </Field>
            <Button type="submit" variant="primary" loading={busy}>
              {t("declare")}
            </Button>
          </form>
        ) : null}
      </section>

      <section className={box}>
        <h2 className="rb-title mb-3">{t("remittances")}</h2>
        {remittances.length ? (
          <ul className="divide-y divide-line">
            {remittances.map((r) => (
              <li key={r.id} className="py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p>
                    <span className="rb-mono-s font-medium">{r.reference}</span>
                    <span className="text-ink-muted"> · {r.holder?.name ?? t("tracecart")} · {format.shortDate(r.declaredAt)}</span>
                  </p>
                  <Badge variant={TONE[r.status]}>{t(`statuses.${r.status}`)}</Badge>
                </div>
                <p className="rb-numeral mt-1">{money(r.amountMinor, r.currency)}</p>
                {r.transferRef ? <p className="text-ink-muted">{t("transferRefShown", { ref: r.transferRef })}</p> : null}
                {r.decisionNote ? <p className="text-ink-muted">{r.decisionNote}</p> : null}
                {canDecide && r.status === "DECLARED" ? <Decide remittance={r} busy={busy} act={act} /> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-ink-muted">{t("noRemittances")}</p>
        )}
      </section>
    </div>
  );
}

/** Finance's answer: what actually arrived, or why it's refused. */
function Decide({ remittance: r, busy, act }: { remittance: Remittance; busy: boolean; act: (fn: () => Promise<unknown>) => void }) {
  const t = useTranslations("cod");
  const [received, setReceived] = useState("");
  const [reason, setReason] = useState("");
  const receivedMinor = toMinor(received, r.currency);
  return (
    <div className="mt-3 grid max-w-md gap-3">
      <Field label={t("received", { currency: r.currency })}>
        <input className={input} inputMode="decimal" value={received} onChange={(e) => setReceived(e.target.value)} />
      </Field>
      <Button variant="primary" loading={busy} disabled={receivedMinor == null} onClick={() => act(() => call("POST", `/cod/remittances/${r.id}/confirm`, { receivedMinor }))}>
        {t("confirm")}
      </Button>
      <Field label={t("rejectReason")}>
        <input className={input} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
      </Field>
      <Button variant="secondary" loading={busy} disabled={!reason.trim()} onClick={() => act(() => call("POST", `/cod/remittances/${r.id}/reject`, { reason: reason.trim() }))}>
        {t("reject")}
      </Button>
    </div>
  );
}
