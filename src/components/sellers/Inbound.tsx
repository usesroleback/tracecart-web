"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { Field, input } from "@/components/ui/form/Form";
import { call } from "@/components/checkout/http";

const box = "rounded-[var(--radius-m)] border border-line bg-surface-raised p-5 text-sm";

type Status = "DRAFT" | "SENT" | "PARTIALLY_RECEIVED" | "RECEIVED" | "CANCELLED";
const TONE: Record<Status, "default" | "info" | "attn" | "positive" | "critical"> = {
  DRAFT: "default",
  SENT: "info",
  PARTIALLY_RECEIVED: "attn",
  RECEIVED: "positive",
  CANCELLED: "critical",
};

interface Line {
  id: string;
  offerId: string;
  sku: string;
  title: string;
  quantity: number;
  acceptedQuantity: number;
  rejectedQuantity: number;
}

interface Row {
  id: string;
  reference: string;
  status: Status;
  destination: { city: string; code: string };
  lines: Line[];
}

interface ListingOption {
  id: string;
  fulfillmentType: string;
  warehouse: { id: string } | null;
  variant: { sku: string };
  product: { title: Record<string, string> };
}

interface House {
  id: string;
  city: string;
  code: string;
}

/** Stock a seller sends to a Tracecart warehouse (ADR-055). */
export function SellerInbound() {
  const t = useTranslations("sellers.inbound");
  const [rows, setRows] = useState<Row[]>([]);
  const [listings, setListings] = useState<ListingOption[]>([]);
  const [houses, setHouses] = useState<House[]>([]);
  const [warehouseId, setWarehouseId] = useState("");
  const [offerId, setOfferId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [inbounds, mine, dest] = await Promise.all([
      call<{ items: Row[] }>("GET", "/seller/inbounds?limit=50"),
      call<{ items: ListingOption[] }>("GET", "/seller/listings?limit=50"),
      call<{ items: House[] }>("GET", "/seller/listings/warehouses"),
    ]);
    setRows(inbounds.items);
    const held = mine.items.filter((l) => l.fulfillmentType === "FULFILLED_BY_TRACECART");
    setListings(held);
    setHouses(dest.items);
    setWarehouseId((id) => id || dest.items[0]?.id || "");
    setOfferId((id) => id || held[0]?.id || "");
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

  const forWarehouse = listings.filter((l) => l.warehouse?.id === warehouseId);

  return (
    <div className="max-w-3xl">
      <h1 className="rb-headline mb-1 text-[28px]">{t("title")}</h1>
      <p className="mb-6 text-sm text-ink-muted">{t("lead")}</p>
      {error ? (
        <p role="alert" className="mb-4 text-sm text-critical">
          {error}
        </p>
      ) : null}

      <form
        className={`${box} mb-6 grid gap-3`}
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          act(async () => {
            const made = await call<Row>("POST", "/seller/inbounds", { warehouseId, lines: [{ offerId, quantity: Number(quantity) }] });
            await call("POST", `/seller/inbounds/${made.id}/send`);
          });
        }}
      >
        <Field label={t("warehouse")} required>
          <select className={input} required value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
            {houses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.city} · {w.code}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("listing")} required>
          <select className={input} required value={offerId} onChange={(e) => setOfferId(e.target.value)}>
            {forWarehouse.map((l) => (
              <option key={l.id} value={l.id}>
                {l.product.title.fr || l.product.title.en || l.variant.sku}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("quantity")} required>
          <input className={input} type="number" min={1} required value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        </Field>
        <Button type="submit" variant="primary" loading={busy} disabled={!offerId}>
          {t("send")}
        </Button>
        {!forWarehouse.length ? <p className="text-ink-muted">{t("noListings")}</p> : null}
      </form>

      {rows.length === 0 ? <p className="text-ink-muted">{t("empty")}</p> : null}
      <ul className="grid gap-3">
        {rows.map((r) => (
          <li key={r.id} className={box}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="rb-mono font-medium">{r.reference}</p>
              <Badge variant={TONE[r.status]}>{t(`statuses.${r.status}`)}</Badge>
            </div>
            <p className="mt-1 text-ink-muted">
              {r.destination.city} · {r.destination.code}
            </p>
            <ul className="mt-2">
              {r.lines.map((l) => (
                <li key={l.id}>
                  {l.title} × {l.quantity}
                  <span className="text-ink-muted">
                    {" "}
                    · {t("progress", { accepted: l.acceptedQuantity, quantity: l.quantity })}
                    {l.rejectedQuantity ? ` · ${t("rejected", { count: l.rejectedQuantity })}` : ""}
                  </span>
                </li>
              ))}
            </ul>
            {r.status === "DRAFT" || r.status === "SENT" ? (
              <Button variant="secondary" className="mt-3" loading={busy} onClick={() => act(() => call("POST", `/seller/inbounds/${r.id}/cancel`))}>
                {t("cancel")}
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
