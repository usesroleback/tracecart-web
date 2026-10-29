"use client";

import { FormEvent, useState } from "react";
import { useTranslations } from "next-intl";
import { api } from "@/lib/apiClient";
import Button from "@/components/ui/button/Button";
import { Badge } from "@/components/ui/badge/Badge";
import { Card } from "@/components/ui/card/Card";
import { EXCEPTION_TYPES, ExceptionSeverity, ExceptionType, Order, OrderException } from "@/lib/types";
import { useFormat } from "@/lib/format";
import { Field, RequiredNote } from "@/components/ui/form/Form";

const input =
  "h-10 w-full rounded-[var(--radius-s)] border border-line-strong bg-surface-raised px-3 text-sm text-ink placeholder:text-ink-muted focus:outline-2 focus:outline-offset-2 focus:outline-focus-ring";

export const SEVERITY_BADGE: Record<ExceptionSeverity, "critical" | "attn" | "outline"> = { HIGH: "critical", MEDIUM: "attn", LOW: "outline" };

/**
 * The order's exceptions: problems someone owns until they're resolved. Some
 * open by themselves (a reported delay, a failed delivery, missing customs
 * documents, tracking gone quiet); staff open the rest and resolve them all.
 */
export function OrderExceptions({ order, isAdmin, onChanged }: { order: Order; isAdmin: boolean; onChanged: () => void }) {
  const t = useTranslations("orders");
  const [opening, setOpening] = useState(false);
  if (!isAdmin && order.exceptions.length === 0) return null;

  return (
    <Card padding={24}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="rb-title">{t("exceptions.title")}</h2>
        {isAdmin && !opening && (
          <Button variant="ghost" size="s" onClick={() => setOpening(true)}>
            {t("exceptions.open")}
          </Button>
        )}
      </div>
      {opening && <OpenForm orderId={order.id} onDone={() => setOpening(false)} onChanged={onChanged} />}
      {order.exceptions.length === 0 ? (
        <p className="mt-3 text-sm text-ink-muted">{t("exceptions.none")}</p>
      ) : (
        <ul className="mt-3 grid">
          {order.exceptions.map((x) => (
            <ExceptionRow key={x.id} orderId={order.id} exception={x} isAdmin={isAdmin} onChanged={onChanged} />
          ))}
        </ul>
      )}
    </Card>
  );
}

function ExceptionRow({ orderId, exception: x, isAdmin, onChanged }: { orderId: string; exception: OrderException; isAdmin: boolean; onChanged: () => void }) {
  const t = useTranslations("orders");
  const tl = useTranslations("labels");
  const f = useFormat();
  const [resolving, setResolving] = useState(false);
  const [resolution, setResolution] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function resolve(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.post(`/orders/${orderId}/exceptions/${x.id}/resolve`, { resolution: resolution.trim() });
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("actionFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="border-b border-line py-3 last:border-b-0">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold text-ink">{tl(`exceptionType.${x.type}`)}</span>
        <Badge variant={x.status === "OPEN" ? SEVERITY_BADGE[x.severity] : "positive"}>
          {x.status === "OPEN" ? tl(`exceptionSeverity.${x.severity}`) : tl("exceptionStatus.RESOLVED")}
        </Badge>
        <span className="rb-mono text-xs text-ink-muted">
          {x.status === "OPEN" ? t("exceptions.openedOn", { when: f.dayTime(x.createdAt) }) : t("exceptions.resolvedOn", { when: f.dayTime(x.resolvedAt!) })}
        </span>
      </div>
      <p className="mt-1 text-sm text-ink">{x.summary}</p>
      {x.customerImpact && <p className="text-[13px] text-ink-muted">{t("exceptions.customerImpact")} : {x.customerImpact}</p>}
      {x.status === "OPEN" && x.nextAction && (
        <p className="text-[13px] text-ink">
          {t("exceptions.nextAction")} : {x.nextAction}
          {x.dueAt ? ` · ${f.date(x.dueAt)}` : ""}
        </p>
      )}
      {x.resolution && <p className="text-[13px] text-ink-muted">{x.resolution}</p>}
      {isAdmin && x.status === "OPEN" && !resolving && (
        <Button variant="secondary" size="s" className="mt-2" onClick={() => setResolving(true)}>
          {t("exceptions.resolve")}
        </Button>
      )}
      {resolving && (
        <form onSubmit={resolve} className="mt-2 grid gap-2">
          <RequiredNote className="col-span-full" />
          <Field label={t("exceptions.resolution")}>
            <input className={input} required value={resolution} onChange={(e) => setResolution(e.target.value)} />
          </Field>
          <div className="flex gap-2">
            <Button type="submit" size="s" loading={busy}>
              {t("exceptions.resolve")}
            </Button>
            <Button variant="ghost" size="s" onClick={() => setResolving(false)}>
              {t("exceptions.cancel")}
            </Button>
          </div>
          {error && <p className="text-xs text-critical">{error}</p>}
        </form>
      )}
    </li>
  );
}

function OpenForm({ orderId, onDone, onChanged }: { orderId: string; onDone: () => void; onChanged: () => void }) {
  const t = useTranslations("orders");
  const tl = useTranslations("labels");
  const [type, setType] = useState<ExceptionType>("OTHER");
  const [severity, setSeverity] = useState<ExceptionSeverity>("MEDIUM");
  const [v, setV] = useState({ summary: "", customerImpact: "", nextAction: "", dueAt: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: e.target.value });

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.post(`/orders/${orderId}/exceptions`, {
        type,
        severity,
        summary: v.summary.trim(),
        customerImpact: v.customerImpact.trim() || undefined,
        nextAction: v.nextAction.trim() || undefined,
        dueAt: v.dueAt ? new Date(`${v.dueAt}T12:00:00Z`).toISOString() : undefined,
      });
      onDone();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("actionFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-3 grid gap-3 rounded-[var(--radius-s)] border border-line p-3 sm:grid-cols-2">
      <RequiredNote className="col-span-full" />
      <Field label={t("exceptions.type")}>
        <select className={input} value={type} onChange={(e) => setType(e.target.value as ExceptionType)}>
          {EXCEPTION_TYPES.filter((x) => x !== "STALE_TRACKING").map((x) => (
            <option key={x} value={x}>
              {tl(`exceptionType.${x}`)}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t("exceptions.severity")}>
        <select className={input} value={severity} onChange={(e) => setSeverity(e.target.value as ExceptionSeverity)}>
          {(["LOW", "MEDIUM", "HIGH"] as const).map((s) => (
            <option key={s} value={s}>
              {tl(`exceptionSeverity.${s}`)}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t("exceptions.summary")} className="sm:col-span-2">
        <input className={input} required value={v.summary} onChange={set("summary")} />
      </Field>
      <Field label={t("exceptions.customerImpact")} className="sm:col-span-2">
        <input className={input} value={v.customerImpact} onChange={set("customerImpact")} />
      </Field>
      <Field label={t("exceptions.nextAction")}>
        <input className={input} value={v.nextAction} onChange={set("nextAction")} />
      </Field>
      <Field label={t("exceptions.dueAt")}>
        <input type="date" className={input} value={v.dueAt} onChange={set("dueAt")} />
      </Field>
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" size="s" loading={busy}>
          {t("exceptions.save")}
        </Button>
        <Button variant="ghost" size="s" onClick={onDone}>
          {t("exceptions.cancel")}
        </Button>
      </div>
      {error && <p className="text-xs text-critical sm:col-span-2">{error}</p>}
    </form>
  );
}
