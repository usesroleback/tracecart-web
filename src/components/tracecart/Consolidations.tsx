"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { api } from "@/lib/apiClient";
import Button from "@/components/ui/button/Button";
import { Badge } from "@/components/ui/badge/Badge";
import { Card } from "@/components/ui/card/Card";
import { RecordEventForm } from "@/components/tracecart/ShipmentTracking";
import { Consolidation, ConsolidationEconomics, ConsolidationLoad, ConsolidationMember, ConsolidationSuggestion } from "@/lib/types";
import { useFormat } from "@/lib/format";

const TH = "whitespace-nowrap border-b border-line bg-surface-sunken px-3 py-2 text-left text-[12px] font-[650] uppercase tracking-[0.04em] text-ink-muted";
const TD = "border-b border-line px-3 py-2 align-middle";
const input =
  "h-10 w-full rounded-[var(--radius-s)] border border-line-strong bg-surface-raised px-3 text-sm text-ink placeholder:text-ink-muted focus:outline-2 focus:outline-offset-2 focus:outline-focus-ring";

const STATUS_BADGE = { OPEN: "info", DISPATCHED: "positive", CANCELLED: "outline" } as const;

type Outcome = { moved?: string[]; recorded?: string[]; replayed?: string[]; skipped?: { reference: string }[]; failed?: { reference: string; message: string }[] };

/**
 * Groupages (API modules/consolidation): paid orders on one carrier service
 * sent together. The administrateur ("admin") sees where grouping pays, forms
 * the groups and hands them over; the carrier ("carrier") picks a group up and
 * reports on it as one. Only the administrateur sees what a group saves.
 */
export function Consolidations({ view, initialGroups, initialSuggestions = [] }: { view: "admin" | "carrier"; initialGroups: Consolidation[]; initialSuggestions?: ConsolidationSuggestion[] }) {
  const t = useTranslations("consolidations");
  const [groups, setGroups] = useState(initialGroups);
  const [suggestions, setSuggestions] = useState(initialSuggestions);
  const [showCancelled, setShowCancelled] = useState(false);
  const admin = view === "admin";

  async function reload() {
    const [g, s] = await Promise.all([api.get<Consolidation[]>("/consolidations"), admin ? api.get<ConsolidationSuggestion[]>("/consolidations/suggestions") : Promise.resolve([])]);
    setGroups(g);
    setSuggestions(s);
  }

  const cancelled = groups.filter((g) => g.status === "CANCELLED");
  const shown = groups.filter((g) => showCancelled || g.status !== "CANCELLED");

  return (
    <div>
      <div className="max-w-2xl">
        <h1 className="rb-headline text-[32px]">{t("title")}</h1>
        <p className="mt-1 text-sm text-ink-muted">{t(admin ? "subtitle" : "carrierSubtitle")}</p>
      </div>

      {admin && (
        <section className="mt-8">
          <h2 className="rb-headline text-xl">{t("suggestions.title")}</h2>
          <p className="mt-1 max-w-3xl text-sm text-ink-muted">{t("suggestions.intro")}</p>
          {suggestions.length === 0 ? (
            <p className="mt-4 text-sm text-ink-muted">{t("suggestions.empty")}</p>
          ) : (
            <div className="mt-4 grid gap-4">
              {suggestions.map((s) => (
                <SuggestionCard key={s.carrierService.id} suggestion={s} onDone={reload} />
              ))}
            </div>
          )}
        </section>
      )}

      <section className="mt-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="rb-headline text-xl">{t("groups.title")}</h2>
          {cancelled.length > 0 && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={showCancelled} onChange={(e) => setShowCancelled(e.target.checked)} />
              {t("groups.showCancelled", { count: cancelled.length })}
            </label>
          )}
        </div>
        {shown.length === 0 ? (
          <p className="mt-4 text-sm text-ink-muted">{t(admin ? "groups.empty" : "groups.carrierEmpty")}</p>
        ) : (
          <div className="mt-4 grid gap-4">
            {shown.map((g) => (
              <GroupCard key={g.id} group={g} view={view} onChanged={reload} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Route({ service }: { service: { name: string; mode: Consolidation["carrierService"]["mode"]; destinationCountry: string } }) {
  const tl = useTranslations("labels");
  return (
    <span className="text-sm text-ink-muted">
      {service.name} · {tl(`transportMode.${service.mode}`)} · → {service.destinationCountry}
    </span>
  );
}

function LoadLine({ load }: { load: ConsolidationLoad }) {
  const t = useTranslations("consolidations");
  const tl = useTranslations("labels");
  const f = useFormat();
  return (
    <div className="text-sm">
      <p>
        {t("load.summary", { orders: load.orders, packages: load.packages, weight: f.number(load.weightKg) })}
        {load.chargeableKg != null && load.chargeableKg > load.weightKg && ` · ${t("load.chargeable", { weight: f.number(load.chargeableKg) })}`}
        {load.handlingFlags.length > 0 && ` · ${load.handlingFlags.map((fl) => tl(`handlingFlag.${fl}`)).join(", ")}`}
      </p>
      {load.unweighed.length > 0 && <p className="text-xs text-attn">{t("load.unweighed", { refs: load.unweighed.join(", ") })}</p>}
      {load.overWeightLimit != null && <p className="text-xs text-critical">{t("load.overLimit", { max: f.number(load.overWeightLimit) })}</p>}
    </div>
  );
}

/** Alone, together, saved — in the hub's currency, with what's estimated or missing. */
function EconomicsLine({ e }: { e: ConsolidationEconomics }) {
  const t = useTranslations("consolidations");
  const f = useFormat();
  const money = (n: number | null) => (n == null ? "—" : f.money(n, e.currency));
  return (
    <div className="text-sm">
      <dl className="flex flex-wrap gap-x-6 gap-y-1">
        <div>
          <dt className="rb-label text-ink-muted">{t("economics.separately")}</dt>
          <dd>{money(e.separately)}</dd>
        </div>
        <div>
          <dt className="rb-label text-ink-muted">{t("economics.together")}</dt>
          <dd>{money(e.groupCost)}</dd>
        </div>
        <div>
          <dt className="rb-label text-ink-muted">{t("economics.saving")}</dt>
          <dd className={e.saving != null && e.saving > 0 ? "font-semibold text-positive" : e.saving != null && e.saving < 0 ? "font-semibold text-critical" : ""}>{money(e.saving)}</dd>
        </div>
      </dl>
      {e.estimated.length > 0 && <p className="mt-1 text-xs text-ink-muted">{t("economics.estimated", { refs: e.estimated.join(", ") })}</p>}
      {e.unpriced.length > 0 && <p className="mt-1 text-xs text-attn">{t("economics.unpriced", { refs: e.unpriced.join(", ") })}</p>}
      {!e.together.priced && <p className="mt-1 text-xs text-attn">{t(`economics.notPriced.${e.together.reason}`)}</p>}
      {e.unconverted && <p className="mt-1 text-xs text-attn">{t("economics.unconverted")}</p>}
    </div>
  );
}

function MemberPicker({ orders, picked, onChange }: { orders: ConsolidationMember[]; picked: Set<string>; onChange: (next: Set<string>) => void }) {
  const tl = useTranslations("labels");
  const f = useFormat();
  return (
    <ul className="grid gap-1 text-sm">
      {orders.map((o) => (
        <li key={o.id}>
          <label className="flex flex-wrap items-center gap-2">
            <input
              type="checkbox"
              checked={picked.has(o.id)}
              onChange={(e) => {
                const next = new Set(picked);
                if (e.target.checked) next.add(o.id);
                else next.delete(o.id);
                onChange(next);
              }}
            />
            <span className="font-semibold">{o.reference}</span>
            <span className="text-ink-muted">
              {o.productName} · {o.destinationCity}
              {o.grossWeightKg && ` · ${f.number(Number(o.grossWeightKg))} kg`}
            </span>
            <Badge variant="outline">{tl(`status.${o.status}`)}</Badge>
          </label>
        </li>
      ))}
    </ul>
  );
}

function SuggestionCard({ suggestion: s, onDone }: { suggestion: ConsolidationSuggestion; onDone: () => Promise<void> }) {
  const t = useTranslations("consolidations");
  const [picked, setPicked] = useState(() => new Set(s.orders.map((o) => o.id)));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function group() {
    setBusy(true);
    setError(null);
    try {
      const orderIds = [...picked];
      if (s.openGroup) await api.post(`/consolidations/${s.openGroup.id}/orders`, { orderIds });
      else await api.post("/consolidations", { carrierServiceId: s.carrierService.id, orderIds });
      await onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card padding={20}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Route service={s.carrierService} />
          <div className="mt-1">
            <LoadLine load={s.load} />
          </div>
        </div>
        <EconomicsLine e={s.economics} />
      </div>
      {s.openGroup && <p className="mt-3 text-sm">{t("suggestions.joins", { reference: s.openGroup.reference, count: s.openGroup.orders })}</p>}
      <div className="mt-3">
        <MemberPicker orders={s.orders} picked={picked} onChange={setPicked} />
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button size="s" loading={busy} disabled={picked.size < (s.openGroup ? 1 : 2)} onClick={group}>
          {s.openGroup ? t("suggestions.add", { reference: s.openGroup.reference }) : t("suggestions.create", { count: picked.size })}
        </Button>
        {error && <p className="text-sm text-critical">{error}</p>}
      </div>
    </Card>
  );
}

function GroupCard({ group: g, view, onChanged }: { group: Consolidation; view: "admin" | "carrier"; onChanged: () => Promise<void> }) {
  const t = useTranslations("consolidations");
  const tl = useTranslations("labels");
  const f = useFormat();
  const admin = view === "admin";
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [panel, setPanel] = useState<"event" | "add" | "cost" | null>(null);
  const open = g.status === "OPEN";
  const at = (s: string) => g.orders.filter((o) => o.status === s).length;
  const allHandedOver = g.orders.length > 0 && at("CONFIRMED_HUB") === g.orders.length;

  async function run(key: string, fn: () => Promise<unknown>) {
    setBusy(key);
    setError(null);
    setOutcome(null);
    try {
      const result = await fn();
      if (result && typeof result === "object" && ("moved" in result || "recorded" in result)) setOutcome(result as Outcome);
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("failed"));
    } finally {
      setBusy(null);
    }
  }

  const advance = (toStatus: string) => run(toStatus, () => api.post(`/consolidations/${g.id}/advance`, { toStatus }));

  return (
    <Card padding={20}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="rb-headline text-lg">{g.reference}</h3>
            <Badge variant={STATUS_BADGE[g.status]}>{t(`status.${g.status}`)}</Badge>
          </div>
          <Route service={g.carrierService} />
          {admin && <p className="text-sm text-ink-muted">{t("carrier", { name: g.carrierService.partner.name })}</p>}
          {g.dispatchedAt && <p className="text-sm text-ink-muted">{t("dispatchedAt", { date: f.dateTime(g.dispatchedAt) })}</p>}
          <div className="mt-2">
            <LoadLine load={g.load} />
          </div>
        </div>
        <div className="grid gap-2">
          {admin && g.economics && <EconomicsLine e={g.economics} />}
          {admin && g.carrierCost && (
            <p className="text-xs text-ink-muted">
              {t(g.costFromRateCard ? "cost.frozen" : "cost.agreed", { amount: f.money(g.carrierCost.amount, g.carrierCost.currency), version: g.rateVersion ?? 0 })}
            </p>
          )}
          {!admin && (
            <p className="text-sm">
              <span className="rb-label block text-ink-muted">{t("price")}</span>
              {g.price ? f.money(g.price.amount, g.price.currency) : t("noPrice")}
            </p>
          )}
        </div>
      </div>
      {g.notes && <p className="mt-3 whitespace-pre-line text-sm">{g.notes}</p>}

      <div className="mt-4 overflow-x-auto rounded-[var(--radius-m)] border border-line">
        <table className="w-full min-w-[640px] border-separate border-spacing-0 text-sm">
          <caption className="sr-only">{t("members.caption", { reference: g.reference })}</caption>
          <thead>
            <tr>
              <th className={TH}>{t("members.order")}</th>
              <th className={TH}>{t("members.goods")}</th>
              <th className={TH}>{t("members.city")}</th>
              <th className={TH}>{t("members.weight")}</th>
              <th className={TH}>{t("members.status")}</th>
              {admin && open && (
                <th className={TH}>
                  <span className="sr-only">{t("members.remove")}</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {g.orders.map((o) => (
              <tr key={o.id}>
                <td className={TD}>
                  <Link href={`/orders/${o.id}`} className="font-semibold underline-offset-2 hover:underline">
                    {o.reference}
                  </Link>
                </td>
                <td className={TD}>
                  {o.productName}
                  {o.quantity > 1 && ` × ${o.quantity}`}
                </td>
                <td className={TD}>{o.destinationCity}</td>
                <td className={TD}>
                  {o.grossWeightKg ? `${f.number(Number(o.grossWeightKg))} kg` : "—"}
                  {o.packageCount != null && <span className="block text-xs text-ink-muted">{t("members.packages", { count: o.packageCount })}</span>}
                </td>
                <td className={TD}>
                  <Badge variant="outline">{tl(`status.${o.status}`)}</Badge>
                </td>
                {admin && open && (
                  <td className={`${TD} text-right`}>
                    <Button size="s" variant="ghost" loading={busy === `rm-${o.id}`} onClick={() => run(`rm-${o.id}`, () => api.delete(`/consolidations/${g.id}/orders/${o.id}`))}>
                      {t("members.remove")}
                    </Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {g.status !== "CANCELLED" && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {admin && open && at("RECEIVED_HUB") > 0 && (
            <Button size="s" loading={busy === "CONFIRMED_HUB"} onClick={() => advance("CONFIRMED_HUB")}>
              {t("actions.handOver", { count: at("RECEIVED_HUB") })}
            </Button>
          )}
          {!admin && open && (
            <Button size="s" loading={busy === "PICKED_UP"} disabled={!allHandedOver} onClick={() => advance("PICKED_UP")}>
              {t("actions.pickUp")}
            </Button>
          )}
          {!admin && g.status === "DISPATCHED" && at("PICKED_UP") > 0 && (
            <Button size="s" loading={busy === "IN_TRANSIT"} onClick={() => advance("IN_TRANSIT")}>
              {t("actions.inTransit", { count: at("PICKED_UP") })}
            </Button>
          )}
          <Button size="s" variant="secondary" onClick={() => setPanel(panel === "event" ? null : "event")}>
            {t("actions.event")}
          </Button>
          {admin && open && (
            <Button size="s" variant="secondary" onClick={() => setPanel(panel === "add" ? null : "add")}>
              {t("actions.add")}
            </Button>
          )}
          {admin && (
            <Button size="s" variant="secondary" onClick={() => setPanel(panel === "cost" ? null : "cost")}>
              {t("actions.cost")}
            </Button>
          )}
          {admin && open && (
            <Button size="s" variant="danger" loading={busy === "cancel"} onClick={() => confirm(t("actions.cancelConfirm")) && run("cancel", () => api.post(`/consolidations/${g.id}/cancel`))}>
              {t("actions.cancel")}
            </Button>
          )}
        </div>
      )}
      {!admin && open && !allHandedOver && <p className="mt-2 text-xs text-ink-muted">{t("actions.waitHandover")}</p>}

      {error && <p className="mt-3 text-sm text-critical">{error}</p>}
      {outcome && <OutcomeLine outcome={outcome} />}

      {panel === "event" && (
        <div className="mt-4 border-t border-line pt-4">
          <p className="mb-3 text-sm text-ink-muted">{t("event.intro")}</p>
          <RecordEventForm
            path={`/consolidations/${g.id}/events`}
            onChanged={async (result) => {
              setOutcome(result as Outcome);
              await onChanged();
            }}
          />
        </div>
      )}
      {panel === "add" && <AddOrders group={g} onDone={async () => (setPanel(null), await onChanged())} />}
      {panel === "cost" && <CostForm group={g} onDone={async () => (setPanel(null), await onChanged())} />}
    </Card>
  );
}

function OutcomeLine({ outcome }: { outcome: Outcome }) {
  const t = useTranslations("consolidations");
  const done = outcome.moved ?? outcome.recorded ?? [];
  return (
    <div className="mt-3 text-sm">
      {done.length > 0 && <p className="text-positive">{t("outcome.done", { count: done.length })}</p>}
      {(outcome.replayed?.length ?? 0) > 0 && <p className="text-ink-muted">{t("outcome.replayed", { refs: outcome.replayed!.join(", ") })}</p>}
      {(outcome.skipped?.length ?? 0) > 0 && <p className="text-ink-muted">{t("outcome.skipped", { refs: outcome.skipped!.map((s) => s.reference).join(", ") })}</p>}
      {outcome.failed?.map((x) => (
        <p key={x.reference} className="text-critical">
          {x.reference} : {x.message}
        </p>
      ))}
    </div>
  );
}

function AddOrders({ group, onDone }: { group: Consolidation; onDone: () => Promise<void> }) {
  const t = useTranslations("consolidations");
  const [candidates, setCandidates] = useState<ConsolidationMember[] | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<ConsolidationMember[]>(`/consolidations/${group.id}/candidates`).then(setCandidates, () => setCandidates([]));
  }, [group.id]);

  async function add() {
    setBusy(true);
    setError(null);
    try {
      await api.post(`/consolidations/${group.id}/orders`, { orderIds: [...picked] });
      await onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 border-t border-line pt-4">
      {candidates === null ? (
        <p className="text-sm text-ink-muted">{t("loading")}</p>
      ) : candidates.length === 0 ? (
        <p className="text-sm text-ink-muted">{t("add.empty")}</p>
      ) : (
        <>
          <MemberPicker orders={candidates} picked={picked} onChange={setPicked} />
          <div className="mt-3 flex items-center gap-3">
            <Button size="s" loading={busy} disabled={picked.size === 0} onClick={add}>
              {t("add.submit", { count: picked.size })}
            </Button>
            {error && <p className="text-sm text-critical">{error}</p>}
          </div>
        </>
      )}
    </div>
  );
}

/** The cost agreed with the carrier for the whole group; cleared, the rate card prices it. */
function CostForm({ group, onDone }: { group: Consolidation; onDone: () => Promise<void> }) {
  const t = useTranslations("consolidations");
  const [amount, setAmount] = useState(group.carrierCost ? String(group.carrierCost.amount) : "");
  const [currency, setCurrency] = useState(group.carrierCost?.currency ?? (group.economics?.together.priced ? group.economics.together.currency : ""));
  const [notes, setNotes] = useState(group.notes ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(clear = false) {
    setBusy(true);
    setError(null);
    try {
      const cost = clear || amount.trim() === "" ? { carrierCost: null } : { carrierCost: Number(amount), carrierCurrency: currency.trim().toUpperCase() };
      await api.patch(`/consolidations/${group.id}`, { ...cost, notes: notes.trim() || null });
      await onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 grid gap-3 border-t border-line pt-4 sm:grid-cols-[1fr_120px]">
      <p className="text-sm text-ink-muted sm:col-span-2">{t("cost.intro")}</p>
      <label className="block text-sm">
        <span className="rb-label mb-1 block">{t("cost.amount")}</span>
        <input className={input} type="number" min="0" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </label>
      <label className="block text-sm">
        <span className="rb-label mb-1 block">{t("cost.currency")}</span>
        <input className={input} maxLength={3} value={currency} onChange={(e) => setCurrency(e.target.value)} required={amount.trim() !== ""} />
      </label>
      <label className="block text-sm sm:col-span-2">
        <span className="rb-label mb-1 block">{t("cost.notes")}</span>
        <textarea className={`${input} h-20 py-2`} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <Button size="s" loading={busy} onClick={() => save()}>
          {t("cost.save")}
        </Button>
        {group.carrierCost && !group.costFromRateCard && (
          <Button size="s" variant="ghost" disabled={busy} onClick={() => save(true)}>
            {t("cost.useRateCard")}
          </Button>
        )}
        {error && <p className="text-sm text-critical">{error}</p>}
      </div>
    </div>
  );
}
