"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import Button from "@/components/ui/button/Button";
import { Field, input } from "@/components/ui/form/Form";
import { call } from "@/components/checkout/http";
import { toMajor } from "@/lib/currency";
import { useFormat } from "@/lib/format";
import { useAuth, useClerk } from "@clerk/nextjs";

interface Row {
  id: string;
  reference: string;
  status: string;
  totalMinor: number;
  currency: string;
  userId: string;
  createdAt: string;
  buyer: { name: string; email: string };
}

/** Colleagues' over-limit orders, to approve or refuse (ADR-060). */
export function CompanyOrders() {
  const t = useTranslations("b2b.orders");
  const ts = useTranslations("checkout.order.status");
  const format = useFormat();
  const { isLoaded, isSignedIn } = useAuth();
  const clerk = useClerk();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await call<{ items: Row[] }>("GET", "/me/company/orders?queue=toApprove");
    setRows(res.items);
  }, []);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load().catch((e) => setError((e as Error).message));
  }, [isLoaded, isSignedIn, load]);

  async function decide(reference: string, decision: "APPROVE" | "REJECT") {
    setBusy(reference);
    setError(null);
    try {
      await call("POST", `/me/company/orders/${reference}/decision`, { decision, note: note[reference]?.trim() || undefined });
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  if (!isLoaded) return null;
  if (!isSignedIn) {
    return (
      <button type="button" className="rounded-[var(--radius-s)] bg-ink px-5 py-3 font-medium text-ink-inverse" onClick={() => clerk.openSignIn({ forceRedirectUrl: window.location.href })}>
        {t("signIn")}
      </button>
    );
  }
  if (error && !rows) return <p className="text-critical">{error}</p>;
  if (!rows) return <p className="text-ink-muted">{t("loading")}</p>;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="rb-headline text-[28px] sm:text-[36px]">{t("title")}</h1>
      <p className="text-sm text-ink-muted">{t("lead")}</p>
      {error ? <p className="text-sm text-critical">{error}</p> : null}
      {!rows.length ? <p className="text-ink-muted">{t("empty")}</p> : null}
      <ul className="grid gap-4">
        {rows.map((o) => (
          <li key={o.id} className="rounded-[var(--radius-m)] border border-line bg-surface-raised p-5">
            <p className="rb-mono-s text-ink-muted">{o.reference}</p>
            <p className="mt-1 font-medium">
              {o.buyer.name} · {format.number(toMajor(o.totalMinor, o.currency))} {o.currency}
            </p>
            <p className="text-sm text-ink-muted">{ts(o.status as "PLACED")}</p>
            <Field label={t("note")} className="mt-3">
              <textarea className={`${input} h-auto min-h-[3rem] py-2`} value={note[o.reference] ?? ""} onChange={(e) => setNote((n) => ({ ...n, [o.reference]: e.target.value }))} />
            </Field>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="primary" loading={busy === o.reference} onClick={() => decide(o.reference, "APPROVE")}>
                {t("approve")}
              </Button>
              <Button variant="secondary" loading={busy === o.reference} onClick={() => decide(o.reference, "REJECT")}>
                {t("reject")}
              </Button>
              <Link href={`/account/orders/${o.reference}`} className="self-center text-sm underline">
                {t("see")}
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
