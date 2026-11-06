"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import Button from "@/components/ui/button/Button";
import { Field, input } from "@/components/ui/form/Form";
import { box, SignInGate } from "@/components/services/SignInGate";
import { Badge } from "@/components/ui/badge/Badge";
import { call } from "@/components/checkout/http";
import type { Address } from "@/components/checkout/types";
import { useFormat } from "@/lib/format";
import { toMajor } from "@/lib/currency";

interface RfqLine {
  sku: string;
  quantity: number;
  offerId: string;
  title: string;
  cataloguePriceMinor: number;
  currency: string;
}

interface RfqRequest {
  id: string;
  status: string;
  description: string;
  destinationCity: string;
  destinationCountry: string;
  lines: RfqLine[];
  note: string | null;
  createdAt: string;
  quotes: { reference: string; status: string; totalMinor: number; currency: string; validUntil: string }[];
}

const TONE: Record<string, "info" | "positive" | "critical" | "attn" | "default"> = {
  OPEN: "info",
  MATCHED: "attn",
  CONVERTED: "positive",
  CLOSED: "default",
};

/** Ask for a deal on catalogue SKUs; staff quote it like "Find it for me" (ADR-069). */
export function CompanyRfq() {
  const t = useTranslations("b2b.rfq");
  return (
    <SignInGate title={t("signIn")} lead={t("signInLead")}>
      {() => <RfqPanel />}
    </SignInGate>
  );
}

function RfqPanel() {
  const t = useTranslations("b2b.rfq");
  const format = useFormat();
  const [requests, setRequests] = useState<RfqRequest[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressId, setAddressId] = useState("");
  const [sku, setSku] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [lines, setLines] = useState<{ sku: string; quantity: number }[]>([]);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [rfqs, places] = await Promise.all([
      call<{ requests: RfqRequest[] }>("GET", "/me/company/rfqs"),
      call<{ addresses: Address[] }>("GET", "/me/addresses"),
    ]);
    setRequests(rfqs.requests);
    setAddresses(places.addresses);
    setAddressId((id) => id || places.addresses.find((a) => a.isDefault)?.id || places.addresses[0]?.id || "");
  }, []);

  useEffect(() => {
    load().catch((e) => setError((e as Error).message));
  }, [load]);

  async function send(e: FormEvent) {
    e.preventDefault();
    if (!lines.length || !addressId) return;
    setBusy(true);
    setError(null);
    try {
      await call("POST", "/me/company/rfqs", { lines, addressId, note: note.trim() || undefined });
      setLines([]);
      setNote("");
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="rb-headline text-[28px]">{t("title")}</h1>
        <p className="mt-1 text-sm text-ink-muted">{t("lead")}</p>
      </div>
      {error ? <p className="text-sm text-critical">{error}</p> : null}
      <form className={`${box} grid gap-3`} onSubmit={send}>
        <Field label={t("address")} required>
          <select className={input} required value={addressId} onChange={(e) => setAddressId(e.target.value)}>
            {addresses.map((a) => (
              <option key={a.id} value={a.id}>
                {a.city} · {a.landmark}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid gap-2 sm:grid-cols-[1fr_6rem_auto]">
          <Field label={t("sku")}>
            <input className={input} value={sku} onChange={(e) => setSku(e.target.value)} maxLength={64} />
          </Field>
          <Field label={t("quantity")}>
            <input className={input} inputMode="numeric" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </Field>
          <div className="flex items-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                const q = Number(quantity);
                if (!sku.trim() || !Number.isInteger(q) || q < 1) return;
                setLines((rows) => [...rows, { sku: sku.trim(), quantity: q }]);
                setSku("");
                setQuantity("1");
              }}
            >
              {t("addLine")}
            </Button>
          </div>
        </div>
        {lines.length ? (
          <ul className="grid gap-1 text-sm">
            {lines.map((l, i) => (
              <li key={`${l.sku}-${i}`} className="flex justify-between gap-3">
                <span>
                  {l.quantity} × {l.sku}
                </span>
                <button type="button" className="text-ink-muted underline" onClick={() => setLines((rows) => rows.filter((_, j) => j !== i))}>
                  {t("remove")}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <Field label={t("note")}>
          <textarea className={`${input} h-auto min-h-[4rem] py-2`} maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <Button type="submit" variant="primary" loading={busy} disabled={!lines.length || !addressId}>
          {t("send")}
        </Button>
      </form>
      <ul className="grid gap-3">
        {requests.map((r) => {
          const open = r.quotes.find((q) => q.status === "SENT");
          return (
            <li key={r.id} className={`${box} grid gap-2`}>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={TONE[r.status] ?? "default"}>{t(`statuses.${r.status}`)}</Badge>
                <span className="text-sm text-ink-muted">
                  {r.destinationCity}, {r.destinationCountry}
                </span>
              </div>
              <ul className="text-sm">
                {r.lines.map((l) => (
                  <li key={`${l.sku}-${l.offerId}`}>
                    {l.quantity} × {l.sku} · {l.title}
                    <span className="text-ink-muted">
                      {" "}
                      ({format.number(toMajor(l.cataloguePriceMinor, l.currency))} {l.currency})
                    </span>
                  </li>
                ))}
              </ul>
              {open ? (
                <Link href={`/account/quotes/${open.reference}`} className="text-sm font-medium underline">
                  {t("seeQuote", { reference: open.reference })}
                </Link>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
