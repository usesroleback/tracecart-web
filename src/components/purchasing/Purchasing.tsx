"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useFormat } from "@/lib/format";
import { toMajor, toMinor } from "@/lib/currency";
import { Badge } from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { Field, input } from "@/components/ui/form/Form";
import { call } from "@/components/checkout/http";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";

// Buying and bringing goods in, in the console (ADR-044). The API checks every
// call, scopes receivers to their warehouse, and sends costs only to those who
// may see them.

const box = "rounded-[var(--radius-m)] border border-line bg-surface-raised p-5 text-sm";
type Tone = "attn" | "info" | "positive" | "default" | "critical";

export interface PurchasingPermissions {
  canBuy: boolean;
  seesCosts: boolean;
  canLogistics: boolean;
  canCustoms: boolean;
  canReceive: boolean;
}

interface Option {
  id: string;
  name: string;
}
interface WarehouseOption extends Option {
  code: string;
  city: string;
  type: string;
}
interface Options {
  warehouses: WarehouseOption[];
  carrierServices: (Option & { mode: string })[];
  suppliers: (Option & { countryCode: string | null })[];
}

interface PoLine {
  id: string;
  variantId: string;
  sku: string;
  title: string;
  quantity: number;
  acceptedQuantity: number;
  rejectedQuantity: number;
  forOrder: { reference: string } | null;
  unitCostMinor?: number;
}

interface Po {
  id: string;
  reference: string;
  status: "DRAFT" | "SENT" | "PARTIALLY_RECEIVED" | "RECEIVED" | "CLOSED" | "CANCELLED";
  supplier: Option;
  destination: { id: string; code: string; city: string };
  createdAt: string;
  currency?: string;
  totalMinor?: number;
  lines: PoLine[];
  receipts: { id: string; reference: string; receivedAt: string; note: string | null; photos: { id: string }[]; lines: { purchaseLineId: string; accepted: number; rejected: number; condition: string; serials: string[]; note: string | null }[] }[];
}

interface Inbound {
  id: string;
  reference: string;
  status: "OPEN" | "DEPARTED" | "AT_CUSTOMS" | "HELD" | "CLEARED" | "ARRIVED" | "RECEIVED" | "CANCELLED";
  origin: { code: string; city: string; countryCode: string };
  destination: { id: string; code: string; city: string; countryCode: string };
  carrierService: { id: string; name: string } | null;
  externalRef: string | null;
  customs: { status: string; reference: string | null; note: string | null; dutiesMinor?: number | null; currency?: string | null };
  cost?: { amountMinor: number; currency: string; fromRateCard: boolean } | null;
  estimate?: { amountMinor: number; currency: string } | null;
  lines: { purchaseLineId: string; purchaseOrderId: string; purchaseOrder: string; sku: string; title: string; quantity: number }[];
  events: { id: string; status: string; note: string | null; createdAt: string }[];
}

const PO_TONE: Record<Po["status"], Tone> = { DRAFT: "default", SENT: "info", PARTIALLY_RECEIVED: "attn", RECEIVED: "positive", CLOSED: "default", CANCELLED: "default" };
const INBOUND_TONE: Record<Inbound["status"], Tone> = { OPEN: "default", DEPARTED: "info", AT_CUSTOMS: "attn", HELD: "critical", CLEARED: "info", ARRIVED: "attn", RECEIVED: "positive", CANCELLED: "default" };

const INBOUND_STEPS: Partial<Record<Inbound["status"], ("depart" | "customs" | "hold" | "release" | "clear" | "arrive" | "close" | "cancel")[]>> = {
  OPEN: ["depart", "cancel"],
  DEPARTED: ["customs", "arrive", "hold"],
  AT_CUSTOMS: ["clear", "hold"],
  HELD: ["release"],
  CLEARED: ["arrive"],
  ARRIVED: ["close"],
};

export function Purchasing(can: PurchasingPermissions) {
  const t = useTranslations("purchasing");
  // Customs work on shipments only: purchase orders aren't theirs to read.
  const seesOrders = can.seesCosts || can.canReceive;
  type Tab = "toBuy" | "orders" | "inbound" | "sellerStock";
  const tabs: Tab[] = [...(can.seesCosts ? (["toBuy"] as const) : []), ...(seesOrders ? (["orders"] as const) : []), "inbound", ...(can.canReceive ? (["sellerStock"] as const) : [])];
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const requested = params.get("tab");
  const fromUrl = tabs.includes(requested as Tab) ? (requested as Tab) : undefined;
  const fallbackTab: Tab = can.seesCosts ? "toBuy" : seesOrders ? "orders" : "inbound";
  const [tab, setTab] = useState<Tab>(fromUrl ?? fallbackTab);
  const [options, setOptions] = useState<Options>({ warehouses: [], carrierServices: [], suppliers: [] });

  useEffect(() => {
    setTab(fromUrl ?? fallbackTab);
  }, [fromUrl, fallbackTab]);

  useEffect(() => {
    if (!can.seesCosts && !can.canLogistics) return;
    Promise.all([call<Pick<Options, "warehouses" | "carrierServices">>("GET", "/purchasing/options"), can.seesCosts ? call<{ items: Options["suppliers"] }>("GET", "/purchasing/suppliers") : Promise.resolve({ items: [] })])
      .then(([o, s]) => setOptions({ ...o, suppliers: s.items }))
      .catch(() => undefined);
  }, [can.seesCosts, can.canLogistics]);

  return (
    <div>
      <h1 className="rb-headline mb-1 text-[28px]">{t("title")}</h1>
      <p className="mb-6 text-sm text-ink-muted">{t("lead")}</p>
      <div role="tablist" className="mb-6 flex flex-wrap gap-4 border-b border-line">
        {tabs.map((x) => (
            <button
              key={x}
              type="button"
              role="tab"
              aria-selected={tab === x}
              onClick={() => {
                setTab(x);
                router.replace(x === tabs[0] ? pathname : `${pathname}?tab=${x}`, { scroll: false });
              }}
              className={`pb-2 text-sm ${tab === x ? "border-b-2 border-ink font-medium text-ink" : "text-ink-muted hover:text-ink"}`}
            >
            {t(`tabs.${x}`)}
          </button>
        ))}
      </div>
      {tab === "toBuy" ? <ToBuy canBuy={can.canBuy} options={options} /> : null}
      {tab === "orders" ? <Orders can={can} options={options} /> : null}
      {tab === "inbound" ? <InboundList can={can} options={options} /> : null}
      {tab === "sellerStock" ? <SellerStock /> : null}
    </div>
  );
}

function useMoney() {
  const format = useFormat();
  return (minor: number, currency: string) => `${format.number(toMajor(minor, currency))} ${currency}`;
}

function Select({ options, value, onChange, label, required }: { options: { id: string; label: string }[]; value: string; onChange: (v: string) => void; label: string; required?: boolean }) {
  const t = useTranslations("purchasing");
  return (
    <Field label={label} required={required}>
      <select className={input} required={required} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{t("pick")}</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

// ---------------------------------------------------------------------------
// What's waiting to be bought

interface ToBuyLine {
  orderLineId: string;
  orderReference: string;
  sku: string;
  title: string;
  quantity: number;
  promiseTo: string;
  destinationWarehouseId: string | null;
  supplier: Option | null;
  sourceUrl: string | null;
  sourcePriceMinor: number | null;
  sourceCurrency: string | null;
}

/** Lines that can share a purchase order sit together: same supplier, destination and currency. */
function ToBuy({ canBuy, options }: { canBuy: boolean; options: Options }) {
  const t = useTranslations("purchasing");
  const format = useFormat();
  const money = useMoney();
  const [lines, setLines] = useState<ToBuyLine[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLines((await call<{ items: ToBuyLine[] }>("GET", "/purchasing/to-buy")).items);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load().catch((e) => setError((e as Error).message));
  }, [load]);

  const groups = new Map<string, ToBuyLine[]>();
  for (const l of lines ?? []) {
    const key = `${l.supplier?.id ?? ""}|${l.destinationWarehouseId ?? ""}|${l.sourceCurrency ?? ""}`;
    groups.set(key, [...(groups.get(key) ?? []), l]);
  }
  const warehouseName = (id: string | null) => options.warehouses.find((w) => w.id === id)?.code ?? "-";

  async function buy(group: ToBuyLine[]) {
    const [first] = group;
    setBusy(true);
    setError(null);
    try {
      await call("POST", "/purchasing/orders", { supplierId: first.supplier!.id, destinationWarehouseId: first.destinationWarehouseId, currency: first.sourceCurrency, lines: group.map((l) => ({ orderLineId: l.orderLineId })) }, { "Idempotency-Key": crypto.randomUUID() });
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-ink-muted">{t("toBuyHint")}</p>
      {error ? (
        <p role="alert" className="text-sm text-critical">
          {error}
        </p>
      ) : null}
      {lines?.length === 0 ? <p className="text-ink-muted">{t("nothingToBuy")}</p> : null}
      {[...groups.entries()].map(([key, group]) => {
        const [first] = group;
        const complete = !!first.supplier && !!first.destinationWarehouseId && !!first.sourceCurrency && group.every((l) => l.sourcePriceMinor != null);
        return (
          <div key={key} className={box}>
            <p className="font-medium">
              {first.supplier?.name ?? t("noSupplier")} → {warehouseName(first.destinationWarehouseId)}
            </p>
            <ul className="mt-2 divide-y divide-line">
              {group.map((l) => (
                <li key={l.orderLineId} className="flex flex-wrap justify-between gap-2 py-2">
                  <span>
                    {l.title} × {l.quantity}
                    <span className="rb-mono-s block text-ink-muted">
                      {l.sku} · {l.orderReference} · {t("promisedFor", { date: format.shortDate(l.promiseTo) })}
                    </span>
                    {l.sourceUrl ? (
                      <a href={l.sourceUrl} target="_blank" rel="noreferrer" className="underline">
                        {t("source")}
                      </a>
                    ) : null}
                  </span>
                  <span className="rb-numeral">{l.sourcePriceMinor != null && l.sourceCurrency ? money(l.sourcePriceMinor, l.sourceCurrency) : t("noCost")}</span>
                </li>
              ))}
            </ul>
            {canBuy ? (
              complete ? (
                <Button variant="primary" className="mt-3" loading={busy} onClick={() => buy(group)}>
                  {t("makeOrder")}
                </Button>
              ) : (
                <p className="mt-3 text-ink-muted">{t("needsDetails")}</p>
              )
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Purchase orders

function Orders({ can, options }: { can: PurchasingPermissions; options: Options }) {
  const t = useTranslations("purchasing");
  const format = useFormat();
  const money = useMoney();
  const [rows, setRows] = useState<Po[]>([]);
  const [arrived, setArrived] = useState<Inbound[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [po, inbound] = await Promise.all([call<{ items: Po[] }>("GET", "/purchasing/orders?limit=100"), call<{ items: Inbound[] }>("GET", "/purchasing/inbound?status=ARRIVED&limit=100")]);
    setRows(po.items);
    setArrived(inbound.items);
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
      {can.canBuy ? <NewStockOrder options={options} busy={busy} act={act} /> : null}
      {rows.length === 0 && !error ? <p className="text-ink-muted">{t("noOrders")}</p> : null}
      {rows.map((p) => {
        const waiting = p.status === "SENT" || p.status === "PARTIALLY_RECEIVED";
        return (
          <div key={p.id} className={box}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p>
                <span className="rb-mono-s font-medium">{p.reference}</span>
                <span className="text-ink-muted">
                  {" "}
                  · {p.supplier.name} → {p.destination.code} · {format.shortDate(p.createdAt)}
                </span>
              </p>
              <Badge variant={PO_TONE[p.status]}>{t(`orderStatuses.${p.status}`)}</Badge>
            </div>
            {p.totalMinor != null && p.currency ? <p className="rb-numeral mt-1">{money(p.totalMinor, p.currency)}</p> : null}
            <ul className="mt-2 divide-y divide-line">
              {p.lines.map((l) => (
                <li key={l.id} className="flex flex-wrap justify-between gap-2 py-2">
                  <span>
                    {l.title}
                    <span className="rb-mono-s block text-ink-muted">
                      {l.sku}
                      {l.forOrder ? ` · ${t("forCustomer", { reference: l.forOrder.reference })}` : ""}
                    </span>
                  </span>
                  <span className="text-right">
                    {t("progress", { accepted: l.acceptedQuantity, quantity: l.quantity })}
                    {l.rejectedQuantity ? <span className="block text-critical">{t("rejectedCount", { count: l.rejectedQuantity })}</span> : null}
                    {l.unitCostMinor != null && p.currency ? <span className="rb-numeral block text-ink-muted">{money(l.unitCostMinor, p.currency)}</span> : null}
                  </span>
                </li>
              ))}
            </ul>
            {p.receipts.length ? (
              <div className="mt-3 border-t border-line pt-3">
                <h3 className="rb-label mb-1">{t("receipts")}</h3>
                <ul className="space-y-1">
                  {p.receipts.map((r) => (
                    <li key={r.id}>
                      <span className="rb-mono-s">{r.reference}</span>
                      <span className="text-ink-muted"> · {format.dayTime(r.receivedAt)}</span>
                      {r.lines.map((l) => (
                        <p key={l.purchaseLineId} className="text-ink-muted">
                          {t("receiptLine", { accepted: l.accepted, rejected: l.rejected })} · {t(`conditions.${l.condition}` as "conditions.GOOD")}
                          {l.note ? ` · ${l.note}` : ""}
                          {l.serials.length ? ` · ${l.serials.join(", ")}` : ""}
                        </p>
                      ))}
                      {r.photos.length ? (
                        <p className="flex flex-wrap gap-3">
                          {r.photos.map((ph, i) => (
                            <a key={ph.id} href={`/api/tracecart/purchasing/receipts/${r.id}/photos/${ph.id}/file`} target="_blank" rel="noreferrer" className="underline">
                              {t("photo", { number: i + 1 })}
                            </a>
                          ))}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {can.canReceive && waiting ? <ReceiveForm po={p} inbound={arrived.filter((s) => s.lines.some((l) => l.purchaseOrderId === p.id))} busy={busy} act={act} /> : null}
            {can.canBuy ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {p.status === "DRAFT" ? (
                  <Button variant="primary" loading={busy} onClick={() => act(() => call("POST", `/purchasing/orders/${p.id}/send`))}>
                    {t("markSent")}
                  </Button>
                ) : null}
                {p.status === "DRAFT" || p.status === "SENT" ? (
                  <Button variant="secondary" loading={busy} onClick={() => act(() => call("POST", `/purchasing/orders/${p.id}/cancel`))}>
                    {t("cancel")}
                  </Button>
                ) : null}
                {p.status === "PARTIALLY_RECEIVED" ? (
                  <Button variant="secondary" loading={busy} onClick={() => act(() => call("POST", `/purchasing/orders/${p.id}/close`))}>
                    {t("closeShort")}
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

interface Checked {
  accepted: string;
  rejected: string;
  condition: string;
  serials: string;
  note: string;
}

const CONDITIONS = ["GOOD", "DAMAGED", "WRONG_ITEM", "MISSING_PARTS"] as const;

/** Goods arrived: what was accepted, rejected and why. It all goes in at once. */
function ReceiveForm({ po, inbound, busy, act }: { po: Po; inbound: Inbound[]; busy: boolean; act: (fn: () => Promise<unknown>) => Promise<void> }) {
  const t = useTranslations("purchasing");
  const open = po.lines.filter((l) => l.acceptedQuantity < l.quantity);
  const [show, setShow] = useState(false);
  const [inboundId, setInboundId] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [checked, setChecked] = useState<Record<string, Checked>>(() => Object.fromEntries(open.map((l) => [l.id, { accepted: "", rejected: "", condition: "GOOD", serials: "", note: "" }])));
  const set = (id: string, patch: Partial<Checked>) => setChecked((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  const entered = open.filter((l) => Number(checked[l.id]?.accepted || 0) + Number(checked[l.id]?.rejected || 0) > 0);

  if (!show) {
    return (
      <Button variant="secondary" className="mt-3" onClick={() => setShow(true)}>
        {t("receive")}
      </Button>
    );
  }
  return (
    <form
      className="mt-3 grid gap-4 border-t border-line pt-3"
      onSubmit={(e) => {
        e.preventDefault();
        act(async () => {
          const updated = await call<Po>(
            "POST",
            "/purchasing/receipts",
            {
              purchaseOrderId: po.id,
              ...(inboundId ? { inboundId } : {}),
              lines: entered.map((l) => {
                const c = checked[l.id];
                const serials = c.serials.split(/[\s,]+/).filter(Boolean);
                return { purchaseLineId: l.id, accepted: Number(c.accepted || 0), rejected: Number(c.rejected || 0), condition: c.condition, ...(serials.length ? { serials } : {}), ...(c.note.trim() ? { note: c.note.trim() } : {}) };
              }),
            },
            { "Idempotency-Key": crypto.randomUUID() }
          );
          if (files.length) {
            const form = new FormData();
            for (const f of files) form.append("photos", f);
            await call("POST", `/purchasing/receipts/${updated.receipts[updated.receipts.length - 1].id}/photos`, form);
          }
          setShow(false);
        });
      }}
    >
      <h3 className="rb-label">{t("receive")}</h3>
      {inbound.length ? (
        <Field label={t("arrivedOn")}>
          <select className={input} value={inboundId} onChange={(e) => setInboundId(e.target.value)}>
            <option value="">{t("noShipment")}</option>
            {inbound.map((s) => (
              <option key={s.id} value={s.id}>
                {s.reference}
              </option>
            ))}
          </select>
        </Field>
      ) : null}
      {open.map((l) => {
        const c = checked[l.id];
        return (
          <fieldset key={l.id} className="grid gap-2 sm:grid-cols-2">
            <legend className="mb-1 font-medium">
              {l.title} · {t("stillExpected", { count: l.quantity - l.acceptedQuantity })}
            </legend>
            <Field label={t("accepted")}>
              <input className={input} type="number" min="0" max={l.quantity - l.acceptedQuantity} step="1" value={c.accepted} onChange={(e) => set(l.id, { accepted: e.target.value })} />
            </Field>
            <Field label={t("rejected")}>
              <input className={input} type="number" min="0" step="1" value={c.rejected} onChange={(e) => set(l.id, { rejected: e.target.value })} />
            </Field>
            <Field label={t("condition")}>
              <select className={input} value={c.condition} onChange={(e) => set(l.id, { condition: e.target.value })}>
                {CONDITIONS.map((x) => (
                  <option key={x} value={x}>
                    {t(`conditions.${x}`)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t("serials")} hint={t("serialsHint")}>
              <input className={`${input} rb-mono`} value={c.serials} onChange={(e) => set(l.id, { serials: e.target.value })} />
            </Field>
            <Field label={t("note")} required={Number(c.rejected || 0) > 0}>
              <input className={input} maxLength={500} required={Number(c.rejected || 0) > 0} value={c.note} onChange={(e) => set(l.id, { note: e.target.value })} />
            </Field>
          </fieldset>
        );
      })}
      <Field label={t("photos")} hint={t("photosHint")}>
        <input className={input} type="file" multiple accept="image/jpeg,image/png,image/webp,image/heic,image/heif" onChange={(e) => setFiles([...(e.target.files ?? [])].slice(0, 6))} />
      </Field>
      <Button type="submit" variant="primary" loading={busy} disabled={!entered.length}>
        {t("recordReceipt")}
      </Button>
    </form>
  );
}

function NewStockOrder({ options, busy, act }: { options: Options; busy: boolean; act: (fn: () => Promise<unknown>) => Promise<void> }) {
  const t = useTranslations("purchasing");
  const money = useMoney();
  const [open, setOpen] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [destination, setDestination] = useState("");
  const [currency, setCurrency] = useState("");
  const [sku, setSku] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [cost, setCost] = useState("");
  const [lines, setLines] = useState<{ variantId: string; sku: string; quantity: number; unitCostMinor: number }[]>([]);
  const [hint, setHint] = useState<string | null>(null);
  const code = currency.trim().toUpperCase();
  const costMinor = code.length === 3 ? toMinor(cost, code) : null;

  async function addLine() {
    setHint(null);
    try {
      const v = await call<{ id: string; sku: string }>("GET", `/purchasing/variants?sku=${encodeURIComponent(sku.trim())}`);
      setLines((prev) => [...prev.filter((l) => l.variantId !== v.id), { variantId: v.id, sku: v.sku, quantity: Number(quantity), unitCostMinor: costMinor! }]);
      setSku("");
      setQuantity("1");
      setCost("");
    } catch (e) {
      setHint((e as Error).message);
    }
  }

  if (!open) {
    return (
      <div>
        <Button variant="secondary" onClick={() => setOpen(true)}>
          {t("newStockOrder")}
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
          await call("POST", "/purchasing/orders", { supplierId, destinationWarehouseId: destination, currency: code, lines: lines.map(({ variantId, quantity: q, unitCostMinor }) => ({ variantId, quantity: q, unitCostMinor })) }, { "Idempotency-Key": crypto.randomUUID() });
          setOpen(false);
          setLines([]);
        });
      }}
    >
      <h2 className="rb-label">{t("newStockOrder")}</h2>
      <Select label={t("supplier")} required value={supplierId} onChange={setSupplierId} options={options.suppliers.map((s) => ({ id: s.id, label: s.name }))} />
      <Select label={t("destination")} required value={destination} onChange={setDestination} options={options.warehouses.filter((w) => w.type === "TRACECART").map((w) => ({ id: w.id, label: `${w.code} · ${w.city}` }))} />
      <Field label={t("currency")} required hint={t("currencyHint")}>
        <input
          className={`${input} rb-mono w-24`}
          required
          maxLength={3}
          value={currency}
          disabled={lines.length > 0}
          onChange={(e) => setCurrency(e.target.value)}
        />
      </Field>
      <div className="flex flex-wrap items-end gap-2">
        <Field label={t("sku")}>
          <input className={`${input} rb-mono`} value={sku} onChange={(e) => setSku(e.target.value)} />
        </Field>
        <Field label={t("quantity")}>
          <input className={`${input} w-20`} type="number" min="1" step="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        </Field>
        <Field label={t("unitCost")}>
          <input className={`${input} w-28`} inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value)} />
        </Field>
        <Button type="button" variant="secondary" disabled={!sku.trim() || Number(quantity) < 1 || costMinor == null} onClick={addLine}>
          {t("addLine")}
        </Button>
      </div>
      {hint ? <p className="text-critical">{hint}</p> : null}
      {lines.length ? (
        <ul>
          {lines.map((l) => (
            <li key={l.variantId} className="flex justify-between gap-2">
              <span className="rb-mono-s">
                {l.sku} × {l.quantity} · {money(l.unitCostMinor, code)}
              </span>
              <button type="button" className="underline" onClick={() => setLines((prev) => prev.filter((x) => x.variantId !== l.variantId))}>
                {t("remove")}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <Button type="submit" variant="primary" loading={busy} disabled={!lines.length || !supplierId || !destination}>
        {t("makeOrder")}
      </Button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Inbound shipments

function InboundList({ can, options }: { can: PurchasingPermissions; options: Options }) {
  const t = useTranslations("purchasing");
  const [rows, setRows] = useState<Inbound[]>([]);
  const [waiting, setWaiting] = useState<Po[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");

  const load = useCallback(async () => {
    const res = await call<{ items: Inbound[] }>("GET", "/purchasing/inbound?limit=100");
    setRows(res.items);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load().catch((e) => setError((e as Error).message));
    if (can.canLogistics && can.seesCosts) {
      Promise.all([call<{ items: Po[] }>("GET", "/purchasing/orders?status=SENT&limit=100"), call<{ items: Po[] }>("GET", "/purchasing/orders?status=PARTIALLY_RECEIVED&limit=100")])
        .then(([a, b]) => setWaiting([...a.items, ...b.items]))
        .catch(() => undefined);
    }
  }, [load, can.canLogistics, can.seesCosts]);

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

  const places = options.warehouses.map((w) => ({ id: w.id, label: `${w.code} · ${w.city}` }));

  return (
    <div className="flex flex-col gap-4">
      {error ? (
        <p role="alert" className="text-sm text-critical">
          {error}
        </p>
      ) : null}
      {can.canLogistics ? (
        <form
          className={`${box} flex flex-wrap items-end gap-3`}
          onSubmit={(e) => {
            e.preventDefault();
            act(() => call("POST", "/purchasing/inbound", { originWarehouseId: origin, destinationWarehouseId: destination }));
          }}
        >
          <Select label={t("origin")} required value={origin} onChange={setOrigin} options={places} />
          <Select label={t("destination")} required value={destination} onChange={setDestination} options={places.filter((p) => p.id !== origin)} />
          <Button type="submit" variant="primary" loading={busy} disabled={!origin || !destination}>
            {t("openInbound")}
          </Button>
        </form>
      ) : null}
      {rows.length === 0 && !error ? <p className="text-ink-muted">{t("noInbound")}</p> : null}
      {rows.map((s) => (
        <InboundCard key={s.id} shipment={s} waiting={waiting} can={can} options={options} busy={busy} act={act} />
      ))}
    </div>
  );
}

function InboundCard({ shipment: s, waiting, can, options, busy, act }: { shipment: Inbound; waiting: Po[]; can: PurchasingPermissions; options: Options; busy: boolean; act: (fn: () => Promise<unknown>) => Promise<void> }) {
  const t = useTranslations("purchasing");
  const format = useFormat();
  const money = useMoney();
  const [note, setNote] = useState("");
  const crossesBorder = s.origin.countryCode !== s.destination.countryCode;
  const steps = (INBOUND_STEPS[s.status] ?? []).filter((a) => {
    if (a === "arrive" && s.status === "DEPARTED" && crossesBorder) return false;
    if (can.canLogistics) return true;
    if (["customs", "hold", "release", "clear"].includes(a)) return can.canCustoms;
    return (a === "arrive" || a === "close") && can.canReceive;
  });
  const step = (action: string) => act(() => call("POST", `/purchasing/inbound/${s.id}/advance`, { action, ...(note.trim() ? { note: note.trim() } : {}) }));

  return (
    <div className={box}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p>
          <span className="rb-mono-s font-medium">{s.reference}</span>
          <span className="text-ink-muted">
            {" "}
            · {s.origin.code} → {s.destination.code}
            {s.carrierService ? ` · ${s.carrierService.name}` : ""}
          </span>
        </p>
        <Badge variant={INBOUND_TONE[s.status]}>{t(`inboundStatuses.${s.status}`)}</Badge>
      </div>
      {s.cost ? <p className="rb-numeral mt-1">{t(s.cost.fromRateCard ? "costFromCard" : "costAgreed", { amount: money(s.cost.amountMinor, s.cost.currency) })}</p> : s.estimate ? <p className="mt-1 text-ink-muted">{t("costEstimate", { amount: money(s.estimate.amountMinor, s.estimate.currency) })}</p> : null}
      <p className="mt-1 text-ink-muted">
        {t("customs")}: {t(`customsStatuses.${s.customs.status}` as "customsStatuses.NOT_STARTED")}
        {s.customs.reference ? ` · ${s.customs.reference}` : ""}
        {s.customs.dutiesMinor != null && s.customs.currency ? ` · ${money(s.customs.dutiesMinor, s.customs.currency)}` : ""}
      </p>
      {s.customs.note ? <p className="text-ink-muted">{s.customs.note}</p> : null}
      {s.lines.length ? (
        <ul className="mt-2">
          {s.lines.map((l) => (
            <li key={l.purchaseLineId}>
              {l.title} × {l.quantity} <span className="rb-mono-s text-ink-muted">{l.purchaseOrder}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {s.status === "OPEN" && can.canLogistics ? <OpenInboundEditor key={s.lines.length} shipment={s} waiting={waiting.filter((p) => p.destination.id === s.destination.id)} options={options} busy={busy} act={act} /> : null}
      {can.canCustoms && !["OPEN", "RECEIVED", "CANCELLED"].includes(s.status) ? <CustomsForm shipment={s} busy={busy} act={act} /> : null}
      {steps.length ? (
        <div className="mt-3 grid gap-2 border-t border-line pt-3">
          {steps.includes("hold") ? (
            <Field label={t("holdReason")}>
              <input className={input} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
            </Field>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {steps.map((a) => (
              <Button key={a} variant={a === "cancel" || a === "hold" ? "secondary" : "primary"} loading={busy} disabled={a === "hold" && !note.trim()} onClick={() => step(a)}>
                {t(`steps.${a}`)}
              </Button>
            ))}
          </div>
        </div>
      ) : null}
      <details className="mt-3">
        <summary className="cursor-pointer text-ink-muted">{t("history")}</summary>
        <ol className="mt-2 space-y-1">
          {s.events.map((e) => (
            <li key={e.id}>
              {t(`inboundStatuses.${e.status}` as "inboundStatuses.OPEN")} <span className="text-ink-muted">· {format.dayTime(e.createdAt)}</span>
              {e.note ? <span className="text-ink-muted"> · {e.note}</span> : null}
            </li>
          ))}
        </ol>
      </details>
    </div>
  );
}

/** What travels on it, its carrier and any cost agreed by hand, while it hasn't left. */
function OpenInboundEditor({ shipment: s, waiting, options, busy, act }: { shipment: Inbound; waiting: Po[]; options: Options; busy: boolean; act: (fn: () => Promise<unknown>) => Promise<void> }) {
  const t = useTranslations("purchasing");
  const [quantities, setQuantities] = useState<Record<string, string>>(() => Object.fromEntries(s.lines.map((l) => [l.purchaseLineId, String(l.quantity)])));
  const [service, setService] = useState(s.carrierService?.id ?? "");
  const [cost, setCost] = useState("");
  const [currency, setCurrency] = useState("");
  const code = currency.trim().toUpperCase();
  const costMinor = code.length === 3 ? toMinor(cost, code) : null;
  const lines = Object.entries(quantities)
    .filter(([, q]) => Number(q) > 0)
    .map(([purchaseLineId, q]) => ({ purchaseLineId, quantity: Number(q) }));
  return (
    <div className="mt-3 grid gap-3 border-t border-line pt-3">
      {waiting.length ? (
        <fieldset className="grid gap-2">
          <legend className="rb-label mb-1">{t("onThisShipment")}</legend>
          {waiting.flatMap((p) =>
            p.lines
              .filter((l) => l.acceptedQuantity < l.quantity)
              .map((l) => (
                <label key={l.id} className="flex flex-wrap items-center justify-between gap-2">
                  <span>
                    {l.title} <span className="rb-mono-s text-ink-muted">{p.reference}</span>
                  </span>
                  <input className={`${input} w-24`} type="number" min="0" max={l.quantity - l.acceptedQuantity} step="1" aria-label={t("quantityOf", { title: l.title })} value={quantities[l.id] ?? ""} onChange={(e) => setQuantities((prev) => ({ ...prev, [l.id]: e.target.value }))} />
                </label>
              ))
          )}
          <Button variant="secondary" loading={busy} onClick={() => act(() => call("POST", `/purchasing/inbound/${s.id}/lines`, { lines }))}>
            {t("saveLines")}
          </Button>
        </fieldset>
      ) : (
        <p className="text-ink-muted">{t("nothingToSend")}</p>
      )}
      <div className="flex flex-wrap items-end gap-2">
        <Select label={t("carrierService")} value={service} onChange={setService} options={options.carrierServices.map((c) => ({ id: c.id, label: c.name }))} />
        <Field label={t("agreedCost")} hint={t("agreedCostHint")}>
          <input className={`${input} w-28`} inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value)} />
        </Field>
        <Field label={t("currency")}>
          <input className={`${input} rb-mono w-20`} maxLength={3} value={currency} onChange={(e) => setCurrency(e.target.value)} />
        </Field>
        <Button variant="secondary" loading={busy} disabled={!!cost && costMinor == null} onClick={() => act(() => call("PATCH", `/purchasing/inbound/${s.id}`, { carrierServiceId: service || null, ...(costMinor != null ? { costMinor, costCurrency: code } : {}) }))}>
          {t("save")}
        </Button>
      </div>
    </div>
  );
}

function CustomsForm({ shipment: s, busy, act }: { shipment: Inbound; busy: boolean; act: (fn: () => Promise<unknown>) => Promise<void> }) {
  const t = useTranslations("purchasing");
  const [reference, setReference] = useState(s.customs.reference ?? "");
  const [duties, setDuties] = useState("");
  const [currency, setCurrency] = useState(s.customs.currency ?? "");
  const [note, setNote] = useState(s.customs.note ?? "");
  const code = currency.trim().toUpperCase();
  const dutiesMinor = code.length === 3 ? toMinor(duties, code) : null;
  return (
    <form
      className="mt-3 flex flex-wrap items-end gap-2 border-t border-line pt-3"
      onSubmit={(e) => {
        e.preventDefault();
        act(() => call("POST", `/purchasing/inbound/${s.id}/customs`, { ...(reference.trim() ? { reference: reference.trim() } : {}), ...(dutiesMinor != null ? { dutiesMinor, currency: code } : {}), ...(note.trim() ? { note: note.trim() } : {}) }));
      }}
    >
      <Field label={t("customsReference")}>
        <input className={`${input} rb-mono`} maxLength={120} value={reference} onChange={(e) => setReference(e.target.value)} />
      </Field>
      <Field label={t("duties")}>
        <input className={`${input} w-28`} inputMode="decimal" value={duties} onChange={(e) => setDuties(e.target.value)} />
      </Field>
      <Field label={t("currency")}>
        <input className={`${input} rb-mono w-20`} maxLength={3} value={currency} onChange={(e) => setCurrency(e.target.value)} />
      </Field>
      <Field label={t("note")}>
        <input className={input} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <Button type="submit" variant="secondary" loading={busy} disabled={!!duties && dutiesMinor == null}>
        {t("save")}
      </Button>
    </form>
  );
}

interface SellerInbound {
  id: string;
  reference: string;
  status: string;
  seller: { name: string };
  destination: { city: string; code: string };
  lines: { id: string; title: string; sku: string; quantity: number; acceptedQuantity: number; rejectedQuantity: number }[];
}

/** Seller stock at this warehouse: SKU and counts, never a price (ADR-055). */
function SellerStock() {
  const t = useTranslations("purchasing");
  const [rows, setRows] = useState<SellerInbound[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [accepted, setAccepted] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setRows((await call<{ items: SellerInbound[] }>("GET", "/seller-inbounds?queue=toReceive&limit=50")).items);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load().catch((e) => setError((e as Error).message));
  }, [load]);

  async function receive(row: SellerInbound) {
    setBusy(true);
    setError(null);
    try {
      const lines = row.lines
        .map((l) => ({ lineId: l.id, accepted: Number(accepted[l.id] ?? l.quantity - l.acceptedQuantity), rejected: 0 }))
        .filter((l) => l.accepted > 0);
      await call("POST", `/seller-inbounds/${row.id}/receive`, { lines });
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-ink-muted">{t("sellerStockHint")}</p>
      {error ? (
        <p role="alert" className="text-sm text-critical">
          {error}
        </p>
      ) : null}
      {rows.length === 0 ? <p className="text-ink-muted">{t("noSellerStock")}</p> : null}
      {rows.map((r) => (
        <div key={r.id} className={box}>
          <p className="font-medium">
            {r.seller.name} <span className="rb-mono-s text-ink-muted">{r.reference}</span>
          </p>
          <ul className="mt-2 grid gap-2">
            {r.lines.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  {l.title} <span className="rb-mono-s text-ink-muted">{l.sku}</span>
                </span>
                <input
                  className={`${input} w-24`}
                  type="number"
                  min={0}
                  max={l.quantity - l.acceptedQuantity}
                  aria-label={t("quantityOf", { title: l.title })}
                  value={accepted[l.id] ?? String(l.quantity - l.acceptedQuantity)}
                  onChange={(e) => setAccepted((prev) => ({ ...prev, [l.id]: e.target.value }))}
                />
              </li>
            ))}
          </ul>
          <Button className="mt-3" variant="primary" loading={busy} onClick={() => receive(r)}>
            {t("receive")}
          </Button>
        </div>
      ))}
    </div>
  );
}
