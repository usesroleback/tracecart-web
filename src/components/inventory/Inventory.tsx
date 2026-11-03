"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useFormat } from "@/lib/format";
import { Badge } from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { Field, input } from "@/components/ui/form/Form";
import { call } from "@/components/checkout/http";

// Stock in the console (ADR-043): levels, the ledger, transfers and counts.
// The API checks every call and scopes everything to one's warehouses.

const box = "rounded-[var(--radius-m)] border border-line bg-surface-raised p-5 text-sm";
const TABS = ["levels", "movements", "transfers", "counts"] as const;
type Tab = (typeof TABS)[number];

interface Warehouse {
  id: string;
  code: string;
  name: string;
  city: string;
}

interface Level {
  id: string;
  variantId: string;
  sku: string;
  title: string;
  warehouse: { id: string; code: string; city: string };
  onHand: number;
  reserved: number;
  available: number;
  reorderPoint: number | null;
  binLocation: string | null;
}

export interface InventoryPermissions {
  canAdjust: boolean;
  canCount: boolean;
  canReceive: boolean;
  canDispatch: boolean;
}

export function Inventory(can: InventoryPermissions) {
  const t = useTranslations("inventory");
  const [tab, setTab] = useState<Tab>("levels");
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [destinations, setDestinations] = useState<Warehouse[]>([]);

  useEffect(() => {
    call<{ items: Warehouse[]; destinations: Warehouse[] }>("GET", "/inventory/warehouses")
      .then((r) => {
        setWarehouses(r.items);
        setDestinations(r.destinations);
      })
      .catch(() => undefined);
  }, []);

  return (
    <div>
      <h1 className="rb-headline mb-1 text-[28px]">{t("title")}</h1>
      <p className="mb-6 text-sm text-ink-muted">{t("lead")}</p>
      <div role="tablist" className="mb-6 flex flex-wrap gap-4 border-b border-line">
        {TABS.map((x) => (
          <button key={x} type="button" role="tab" aria-selected={tab === x} onClick={() => setTab(x)} className={`pb-2 text-sm ${tab === x ? "border-b-2 border-ink font-medium text-ink" : "text-ink-muted hover:text-ink"}`}>
            {t(`tabs.${x}`)}
          </button>
        ))}
      </div>
      {tab === "levels" ? <Levels warehouses={warehouses} canAdjust={can.canAdjust} /> : null}
      {tab === "movements" ? <Movements warehouses={warehouses} /> : null}
      {tab === "transfers" ? <Transfers warehouses={warehouses} destinations={destinations} can={can} /> : null}
      {tab === "counts" ? <Counts warehouses={warehouses} can={can} /> : null}
    </div>
  );
}

function WarehouseSelect({ warehouses, value, onChange, all }: { warehouses: Warehouse[]; value: string; onChange: (id: string) => void; all?: boolean }) {
  const t = useTranslations("inventory");
  return (
    <select className={`${input} max-w-[16rem]`} value={value} aria-label={t("warehouse")} required={!all} onChange={(e) => onChange(e.target.value)}>
      <option value="">{all ? t("allWarehouses") : t("pick")}</option>
      {warehouses.map((w) => (
        <option key={w.id} value={w.id}>
          {w.code} · {w.city}
        </option>
      ))}
    </select>
  );
}

// ---------------------------------------------------------------------------
// Levels

function Levels({ warehouses, canAdjust }: { warehouses: Warehouse[]; canAdjust: boolean }) {
  const t = useTranslations("inventory");
  const [warehouseId, setWarehouseId] = useState("");
  const [q, setQ] = useState("");
  const [low, setLow] = useState(false);
  const [rows, setRows] = useState<Level[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (after: string | null, w: string, query: string, lowOnly: boolean) => {
    const p = new URLSearchParams({ limit: "50" });
    if (w) p.set("warehouseId", w);
    if (query.trim()) p.set("q", query.trim());
    if (lowOnly) p.set("low", "true");
    if (after) p.set("cursor", after);
    try {
      const res = await call<{ items: Level[]; nextCursor: string | null }>("GET", `/inventory/levels?${p}`);
      setRows((prev) => (after ? [...prev, ...res.items] : res.items));
      setCursor(res.nextCursor);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(null, "", "", false);
  }, [load]);

  return (
    <div>
      <form
        role="search"
        className="mb-4 flex flex-wrap items-center gap-2"
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          load(null, warehouseId, q, low);
        }}
      >
        <WarehouseSelect
          all
          warehouses={warehouses}
          value={warehouseId}
          onChange={(id) => {
            setWarehouseId(id);
            load(null, id, q, low);
          }}
        />
        <input className={`${input} max-w-sm`} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search")} aria-label={t("search")} />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={low}
            onChange={(e) => {
              setLow(e.target.checked);
              load(null, warehouseId, q, e.target.checked);
            }}
          />
          {t("onlyLow")}
        </label>
        <Button type="submit" variant="secondary">
          {t("find")}
        </Button>
      </form>
      {error ? <p className="mb-4 text-sm text-critical">{error}</p> : null}
      <div className="overflow-x-auto rounded-[var(--radius-m)] border border-line bg-surface-raised">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line text-ink-muted">
            <tr>
              <th className="px-4 py-3 font-medium">{t("columns.item")}</th>
              <th className="px-4 py-3 font-medium">{t("warehouse")}</th>
              <th className="px-4 py-3 font-medium">{t("columns.bin")}</th>
              <th className="px-4 py-3 text-right font-medium">{t("columns.onHand")}</th>
              <th className="px-4 py-3 text-right font-medium">{t("columns.held")}</th>
              <th className="px-4 py-3 text-right font-medium">{t("columns.free")}</th>
              {canAdjust ? <th className="px-4 py-3" /> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((l) => (
              <LevelRow
                key={l.id}
                level={l}
                canAdjust={canAdjust}
                open={open === l.id}
                onToggle={() => setOpen(open === l.id ? null : l.id)}
                onChanged={() => {
                  setOpen(null);
                  load(null, warehouseId, q, low);
                }}
              />
            ))}
          </tbody>
        </table>
        {rows.length === 0 && !error ? <p className="px-4 py-8 text-center text-ink-muted">{t("empty")}</p> : null}
      </div>
      {cursor ? (
        <Button variant="secondary" className="mt-4" onClick={() => load(cursor, warehouseId, q, low)}>
          {t("more")}
        </Button>
      ) : null}
    </div>
  );
}

const REASONS = ["DAMAGED", "LOST", "FOUND", "CORRECTION", "OTHER"] as const;

function LevelRow({ level: l, canAdjust, open, onToggle, onChanged }: { level: Level; canAdjust: boolean; open: boolean; onToggle: () => void; onChanged: () => void }) {
  const t = useTranslations("inventory");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState<(typeof REASONS)[number]>("CORRECTION");
  const [note, setNote] = useState("");
  const [bin, setBin] = useState(l.binLocation ?? "");
  const [reorder, setReorder] = useState(l.reorderPoint == null ? "" : String(l.reorderPoint));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const low = l.available <= (l.reorderPoint ?? 0);

  async function act(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      onChanged();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <tr>
        <td className="px-4 py-3">
          {l.title}
          <p className="rb-mono-s text-ink-muted">{l.sku}</p>
        </td>
        <td className="px-4 py-3">{l.warehouse.code}</td>
        <td className="rb-mono-s px-4 py-3">{l.binLocation ?? t("noBin")}</td>
        <td className="rb-numeral px-4 py-3 text-right">{l.onHand}</td>
        <td className="rb-numeral px-4 py-3 text-right">{l.reserved}</td>
        <td className="rb-numeral px-4 py-3 text-right">{low ? <Badge variant="attn">{l.available}</Badge> : l.available}</td>
        {canAdjust ? (
          <td className="px-4 py-3 text-right">
            <button type="button" onClick={onToggle} aria-expanded={open} className="underline">
              {t("edit")}
            </button>
          </td>
        ) : null}
      </tr>
      {open ? (
        <tr>
          <td colSpan={7} className="bg-surface-sunken px-4 py-4">
            {error ? (
              <p role="alert" className="mb-3 text-critical">
                {error}
              </p>
            ) : null}
            <div className="grid gap-6 md:grid-cols-2">
              <form
                className="grid gap-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  act(() => call("POST", "/inventory/adjustments", { warehouseId: l.warehouse.id, variantId: l.variantId, quantity: Number(quantity), reason, ...(note.trim() ? { note: note.trim() } : {}) }));
                }}
              >
                <h3 className="rb-label">{t("adjust")}</h3>
                <Field label={t("adjustQuantity")} required hint={t("adjustHint")}>
                  <input className={input} type="number" step="1" required value={quantity} onChange={(e) => setQuantity(e.target.value)} />
                </Field>
                <Field label={t("reason")} required>
                  <select className={input} value={reason} onChange={(e) => setReason(e.target.value as (typeof REASONS)[number])}>
                    {REASONS.map((r) => (
                      <option key={r} value={r}>
                        {t(`reasons.${r}`)}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={t("note")} required={reason === "OTHER"}>
                  <input className={input} maxLength={500} required={reason === "OTHER"} value={note} onChange={(e) => setNote(e.target.value)} />
                </Field>
                <Button type="submit" variant="primary" loading={busy} disabled={!quantity || Number(quantity) === 0}>
                  {t("adjustCta")}
                </Button>
              </form>
              <form
                className="grid content-start gap-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  act(() => call("PATCH", `/inventory/levels/${l.id}`, { binLocation: bin.trim() || null, reorderPoint: reorder === "" ? null : Number(reorder) }));
                }}
              >
                <h3 className="rb-label">{t("placement")}</h3>
                <Field label={t("columns.bin")}>
                  <input className={`${input} rb-mono`} maxLength={40} value={bin} onChange={(e) => setBin(e.target.value)} />
                </Field>
                <Field label={t("reorderPoint")}>
                  <input className={input} type="number" min="0" step="1" value={reorder} onChange={(e) => setReorder(e.target.value)} />
                </Field>
                <Button type="submit" variant="secondary" loading={busy}>
                  {t("save")}
                </Button>
              </form>
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}

// ---------------------------------------------------------------------------
// The ledger

interface Movement {
  id: string;
  sku: string;
  title: string;
  warehouse: { code: string };
  type: string;
  quantity: number;
  onHandAfter: number;
  reason: string | null;
  note: string | null;
  createdAt: string;
}

function Movements({ warehouses }: { warehouses: Warehouse[] }) {
  const t = useTranslations("inventory");
  const format = useFormat();
  const [warehouseId, setWarehouseId] = useState("");
  const [rows, setRows] = useState<Movement[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (after: string | null, w: string) => {
    const p = new URLSearchParams({ limit: "50" });
    if (w) p.set("warehouseId", w);
    if (after) p.set("cursor", after);
    try {
      const res = await call<{ items: Movement[]; nextCursor: string | null }>("GET", `/inventory/movements?${p}`);
      setRows((prev) => (after ? [...prev, ...res.items] : res.items));
      setCursor(res.nextCursor);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(null, "");
  }, [load]);

  return (
    <div>
      <div className="mb-4">
        <WarehouseSelect
          all
          warehouses={warehouses}
          value={warehouseId}
          onChange={(id) => {
            setWarehouseId(id);
            load(null, id);
          }}
        />
      </div>
      {error ? <p className="mb-4 text-sm text-critical">{error}</p> : null}
      <div className="overflow-x-auto rounded-[var(--radius-m)] border border-line bg-surface-raised">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line text-ink-muted">
            <tr>
              <th className="px-4 py-3 font-medium">{t("columns.when")}</th>
              <th className="px-4 py-3 font-medium">{t("columns.item")}</th>
              <th className="px-4 py-3 font-medium">{t("warehouse")}</th>
              <th className="px-4 py-3 font-medium">{t("columns.what")}</th>
              <th className="px-4 py-3 text-right font-medium">{t("columns.change")}</th>
              <th className="px-4 py-3 text-right font-medium">{t("columns.after")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((m) => (
              <tr key={m.id}>
                <td className="px-4 py-3 text-ink-muted">{format.dayTime(m.createdAt)}</td>
                <td className="px-4 py-3">
                  {m.title}
                  <p className="rb-mono-s text-ink-muted">{m.sku}</p>
                </td>
                <td className="px-4 py-3">{m.warehouse.code}</td>
                <td className="px-4 py-3">
                  {t(`movementTypes.${m.type}` as "movementTypes.COUNT")}
                  {m.reason ? ` · ${t(`reasons.${m.reason}` as "reasons.OTHER")}` : ""}
                  {m.note ? <p className="text-ink-muted">{m.note}</p> : null}
                </td>
                <td className="rb-numeral px-4 py-3 text-right">{m.quantity > 0 ? `+${m.quantity}` : m.quantity}</td>
                <td className="rb-numeral px-4 py-3 text-right">{m.onHandAfter}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && !error ? <p className="px-4 py-8 text-center text-ink-muted">{t("noMovements")}</p> : null}
      </div>
      {cursor ? (
        <Button variant="secondary" className="mt-4" onClick={() => load(cursor, warehouseId)}>
          {t("more")}
        </Button>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Transfers

interface Transfer {
  id: string;
  reference: string;
  status: "PLANNED" | "IN_TRANSIT" | "RECEIVED" | "CANCELLED";
  from: Warehouse;
  to: Warehouse;
  note: string | null;
  externalRef: string | null;
  createdAt: string;
  lines: { variantId: string; sku: string; title: string; quantity: number; receivedQuantity: number | null }[];
}

const TRANSFER_TONE: Record<Transfer["status"], "attn" | "info" | "positive" | "default"> = { PLANNED: "attn", IN_TRANSIT: "info", RECEIVED: "positive", CANCELLED: "default" };

function Transfers({ warehouses, destinations, can }: { warehouses: Warehouse[]; destinations: Warehouse[]; can: InventoryPermissions }) {
  const t = useTranslations("inventory");
  const format = useFormat();
  const [rows, setRows] = useState<Transfer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await call<{ items: Transfer[] }>("GET", "/inventory/transfers?limit=100");
    setRows(res.items);
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

  return (
    <div className="flex flex-col gap-4">
      {error ? (
        <p role="alert" className="text-sm text-critical">
          {error}
        </p>
      ) : null}
      {can.canAdjust ? <NewTransfer warehouses={warehouses} destinations={destinations} busy={busy} act={act} /> : null}
      {rows.length === 0 && !error ? <p className="text-ink-muted">{t("noTransfers")}</p> : null}
      {rows.map((r) => (
        <div key={r.id} className={box}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p>
              <span className="rb-mono-s font-medium">{r.reference}</span>
              <span className="text-ink-muted">
                {" "}
                · {r.from.code} → {r.to.code} · {format.shortDate(r.createdAt)}
              </span>
            </p>
            <Badge variant={TRANSFER_TONE[r.status]}>{t(`transferStatuses.${r.status}`)}</Badge>
          </div>
          {r.note ? <p className="mt-1 text-ink-muted">{r.note}</p> : null}
          {r.externalRef ? <p className="rb-mono-s mt-1 text-ink-muted">{r.externalRef}</p> : null}
          {r.status === "IN_TRANSIT" && can.canReceive ? (
            <ReceiveForm transfer={r} busy={busy} onReceive={(lines) => act(() => call("POST", `/inventory/transfers/${r.id}/receive`, { lines }))} />
          ) : (
            <ul className="mt-2">
              {r.lines.map((l) => (
                <li key={l.variantId}>
                  {l.title} × {l.quantity}
                  {l.receivedQuantity != null && l.receivedQuantity < l.quantity ? <span className="text-critical"> · {t("gap", { received: l.receivedQuantity })}</span> : null}
                </li>
              ))}
            </ul>
          )}
          {r.status === "PLANNED" ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {can.canDispatch ? (
                <Button variant="primary" loading={busy} onClick={() => act(() => call("POST", `/inventory/transfers/${r.id}/dispatch`, {}))}>
                  {t("dispatch")}
                </Button>
              ) : null}
              {can.canAdjust ? (
                <Button variant="secondary" loading={busy} onClick={() => act(() => call("POST", `/inventory/transfers/${r.id}/cancel`))}>
                  {t("cancelTransfer")}
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function ReceiveForm({ transfer, busy, onReceive }: { transfer: Transfer; busy: boolean; onReceive: (lines: { variantId: string; receivedQuantity: number }[]) => void }) {
  const t = useTranslations("inventory");
  const [got, setGot] = useState<Record<string, string>>(() => Object.fromEntries(transfer.lines.map((l) => [l.variantId, String(l.quantity)])));
  return (
    <form
      className="mt-3 grid max-w-md gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        onReceive(transfer.lines.map((l) => ({ variantId: l.variantId, receivedQuantity: Number(got[l.variantId]) })));
      }}
    >
      {transfer.lines.map((l) => (
        <Field key={l.variantId} label={t("receivedOf", { title: l.title, quantity: l.quantity })} required>
          <input className={input} type="number" min="0" max={l.quantity} step="1" required value={got[l.variantId]} onChange={(e) => setGot((prev) => ({ ...prev, [l.variantId]: e.target.value }))} />
        </Field>
      ))}
      <Button type="submit" variant="primary" loading={busy}>
        {t("receive")}
      </Button>
    </form>
  );
}

function NewTransfer({ warehouses, destinations, busy, act }: { warehouses: Warehouse[]; destinations: Warehouse[]; busy: boolean; act: (fn: () => Promise<unknown>) => Promise<void> }) {
  const t = useTranslations("inventory");
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sku, setSku] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [lines, setLines] = useState<{ variantId: string; sku: string; quantity: number }[]>([]);
  const [hint, setHint] = useState<string | null>(null);

  async function addLine() {
    setHint(null);
    const res = await call<{ items: Level[] }>("GET", `/inventory/levels?warehouseId=${from}&q=${encodeURIComponent(sku.trim())}&limit=20`);
    const found = res.items.find((l) => l.sku.toLowerCase() === sku.trim().toLowerCase());
    if (!found) {
      setHint(t("noSuchSku"));
      return;
    }
    setLines((prev) => [...prev.filter((l) => l.variantId !== found.variantId), { variantId: found.variantId, sku: found.sku, quantity: Number(quantity) }]);
    setSku("");
    setQuantity("1");
  }

  if (!open) {
    return (
      <div>
        <Button variant="secondary" onClick={() => setOpen(true)}>
          {t("newTransfer")}
        </Button>
      </div>
    );
  }
  return (
    <form
      className={`${box} grid max-w-xl gap-3`}
      onSubmit={(e) => {
        e.preventDefault();
        act(async () => {
          await call("POST", "/inventory/transfers", { fromWarehouseId: from, toWarehouseId: to, lines: lines.map(({ variantId, quantity: q }) => ({ variantId, quantity: q })) });
          setOpen(false);
          setLines([]);
        });
      }}
    >
      <h2 className="rb-label">{t("newTransfer")}</h2>
      <Field label={t("from")} required>
        <WarehouseSelect
          warehouses={warehouses}
          value={from}
          onChange={(id) => {
            setFrom(id);
            setLines([]);
          }}
        />
      </Field>
      <Field label={t("to")} required>
        <WarehouseSelect warehouses={destinations.filter((w) => w.id !== from)} value={to} onChange={setTo} />
      </Field>
      <div className="flex flex-wrap items-end gap-2">
        <Field label={t("sku")}>
          <input className={`${input} rb-mono`} value={sku} onChange={(e) => setSku(e.target.value)} />
        </Field>
        <Field label={t("quantity")}>
          <input className={`${input} w-24`} type="number" min="1" step="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        </Field>
        <Button type="button" variant="secondary" disabled={!from || !sku.trim() || Number(quantity) < 1} onClick={() => addLine().catch((e) => setHint((e as Error).message))}>
          {t("addLine")}
        </Button>
      </div>
      {hint ? <p className="text-critical">{hint}</p> : null}
      {lines.length ? (
        <ul>
          {lines.map((l) => (
            <li key={l.variantId} className="flex justify-between gap-2">
              <span className="rb-mono-s">
                {l.sku} × {l.quantity}
              </span>
              <button type="button" className="underline" onClick={() => setLines((prev) => prev.filter((x) => x.variantId !== l.variantId))}>
                {t("remove")}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <Button type="submit" variant="primary" loading={busy} disabled={!lines.length || !to}>
        {t("planTransfer")}
      </Button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Counts

interface CountRow {
  id: string;
  reference: string;
  status: "OPEN" | "SUBMITTED" | "APPLIED" | "CANCELLED";
  warehouse: { code: string; city: string };
  lineCount: number;
  createdAt: string;
}

interface CountDetail extends Omit<CountRow, "lineCount"> {
  note: string | null;
  decisionNote: string | null;
  lines: { variantId: string; sku: string; title: string; binLocation: string | null; counted: number | null; expected?: number; difference?: number | null }[];
}

const COUNT_TONE: Record<CountRow["status"], "attn" | "info" | "positive" | "default"> = { OPEN: "attn", SUBMITTED: "info", APPLIED: "positive", CANCELLED: "default" };

function Counts({ warehouses, can }: { warehouses: Warehouse[]; can: InventoryPermissions }) {
  const t = useTranslations("inventory");
  const format = useFormat();
  const [rows, setRows] = useState<CountRow[]>([]);
  const [detail, setDetail] = useState<CountDetail | null>(null);
  const [warehouseId, setWarehouseId] = useState("");
  const [binPrefix, setBinPrefix] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await call<{ items: CountRow[] }>("GET", "/inventory/counts?limit=100");
    setRows(res.items);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load().catch((e) => setError((e as Error).message));
  }, [load]);

  async function act(fn: () => Promise<CountDetail>) {
    setBusy(true);
    setError(null);
    try {
      setDetail(await fn());
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {error ? (
        <p role="alert" className="text-sm text-critical">
          {error}
        </p>
      ) : null}
      {can.canAdjust ? (
        <form
          className={`${box} flex flex-wrap items-end gap-3`}
          onSubmit={(e) => {
            e.preventDefault();
            act(() => call<CountDetail>("POST", "/inventory/counts", { warehouseId, ...(binPrefix.trim() ? { binPrefix: binPrefix.trim() } : {}) }));
          }}
        >
          <Field label={t("warehouse")} required>
            <WarehouseSelect warehouses={warehouses} value={warehouseId} onChange={setWarehouseId} />
          </Field>
          <Field label={t("binPrefix")} hint={t("binPrefixHint")}>
            <input className={`${input} rb-mono`} maxLength={40} value={binPrefix} onChange={(e) => setBinPrefix(e.target.value)} />
          </Field>
          <Button type="submit" variant="primary" loading={busy} disabled={!warehouseId}>
            {t("startCount")}
          </Button>
        </form>
      ) : null}
      {detail ? <CountPanel key={`${detail.id}-${detail.status}`} count={detail} can={can} busy={busy} act={act} onClose={() => setDetail(null)} /> : null}
      {rows.length === 0 && !error ? <p className="text-ink-muted">{t("noCounts")}</p> : null}
      {rows.length ? (
        <ul className={`${box} divide-y divide-line`}>
          {rows.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <button type="button" className="rb-mono-s font-medium underline" onClick={() => act(() => call<CountDetail>("GET", `/inventory/counts/${c.id}`))}>
                {c.reference}
              </button>
              <span className="text-ink-muted">
                {c.warehouse.code} · {t("lineCount", { count: c.lineCount })} · {format.shortDate(c.createdAt)}
              </span>
              <Badge variant={COUNT_TONE[c.status]}>{t(`countStatuses.${c.status}`)}</Badge>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function CountPanel({ count: c, can, busy, act, onClose }: { count: CountDetail; can: InventoryPermissions; busy: boolean; act: (fn: () => Promise<CountDetail>) => Promise<void>; onClose: () => void }) {
  const t = useTranslations("inventory");
  const [found, setFound] = useState<Record<string, string>>({});
  const post = (path: string, body?: unknown) => act(() => call<CountDetail>("POST", `/inventory/counts/${c.id}/${path}`, body));
  const entered = c.lines.filter((l) => found[l.variantId] !== undefined && found[l.variantId] !== "");
  const counting = c.status === "OPEN" && can.canCount;
  return (
    <div className={box}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="rb-title rb-mono">{c.reference}</h2>
        <button type="button" className="underline" onClick={onClose}>
          {t("close")}
        </button>
      </div>
      {c.decisionNote ? <p className="mb-3 text-ink-muted">{c.decisionNote}</p> : null}
      {c.status === "OPEN" ? <p className="mb-3 text-ink-muted">{t("blindHint")}</p> : null}
      <table className="w-full text-left">
        <thead className="text-ink-muted">
          <tr>
            <th className="py-2 font-medium">{t("columns.bin")}</th>
            <th className="py-2 font-medium">{t("columns.item")}</th>
            <th className="py-2 text-right font-medium">{t("columns.counted")}</th>
            {c.status !== "OPEN" ? <th className="py-2 text-right font-medium">{t("columns.expected")}</th> : null}
            {c.status !== "OPEN" ? <th className="py-2 text-right font-medium">{t("columns.difference")}</th> : null}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {c.lines.map((l) => (
            <tr key={l.variantId}>
              <td className="rb-mono-s py-2">{l.binLocation ?? t("noBin")}</td>
              <td className="py-2">
                {l.title}
                <p className="rb-mono-s text-ink-muted">{l.sku}</p>
              </td>
              <td className="py-2 text-right">
                {counting ? (
                  <input className={`${input} ml-auto w-24 text-right`} type="number" min="0" step="1" aria-label={t("countedOf", { sku: l.sku })} value={found[l.variantId] ?? ""} onChange={(e) => setFound((prev) => ({ ...prev, [l.variantId]: e.target.value }))} />
                ) : (
                  <span className="rb-numeral">{l.counted ?? "-"}</span>
                )}
              </td>
              {c.status !== "OPEN" ? <td className="rb-numeral py-2 text-right">{l.expected}</td> : null}
              {c.status !== "OPEN" ? <td className={`rb-numeral py-2 text-right ${l.difference ? "text-critical" : ""}`}>{l.difference == null ? "-" : l.difference > 0 ? `+${l.difference}` : l.difference}</td> : null}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-4 flex flex-wrap gap-2">
        {counting ? (
          <Button variant="primary" loading={busy} disabled={!entered.length} onClick={() => post("submit", { lines: entered.map((l) => ({ variantId: l.variantId, counted: Number(found[l.variantId]) })) })}>
            {t("submitCount")}
          </Button>
        ) : null}
        {c.status === "SUBMITTED" && can.canAdjust ? (
          <>
            <Button variant="primary" loading={busy} onClick={() => post("approve", {})}>
              {t("approveCount")}
            </Button>
            <Button variant="secondary" loading={busy} onClick={() => post("send-back", {})}>
              {t("sendBack")}
            </Button>
          </>
        ) : null}
        {(c.status === "OPEN" || c.status === "SUBMITTED") && can.canAdjust ? (
          <Button variant="secondary" loading={busy} onClick={() => post("cancel")}>
            {t("cancelCount")}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
