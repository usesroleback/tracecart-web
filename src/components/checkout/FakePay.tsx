"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useFormat } from "@/lib/format";
import { toMajor } from "@/lib/currency";
import { call } from "./http";

/**
 * The fake payment provider's page (tests and demos; the API refuses it in
 * production): pay or fail, then back to the order, as after a real provider.
 */
export function FakePay({ paymentId }: { paymentId: string }) {
  const t = useTranslations("checkout.fakePay");
  const format = useFormat();
  const router = useRouter();
  const [payment, setPayment] = useState<{ amountMinor: number; currency: string; reference: string; status: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    call<{ amountMinor: number; currency: string; reference: string; status: string }>("GET", `/payments/fake/${paymentId}`)
      .then(setPayment)
      .catch((e) => setError((e as Error).message));
  }, [paymentId]);

  async function answer(outcome: "success" | "failure") {
    setBusy(true);
    try {
      const r = await call<{ reference: string }>("POST", `/payments/fake/${paymentId}`, { outcome });
      router.push(`/checkout/done/${r.reference}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  if (error) return <p className="text-critical">{error}</p>;
  if (!payment) return <p className="text-ink-muted">…</p>;
  return (
    <div className="mx-auto max-w-md rounded-[var(--radius-m)] border border-line bg-surface-raised p-6 text-center">
      <p className="rb-overline text-ink-muted">{t("label")}</p>
      <p className="rb-mono-s mt-3">{payment.reference}</p>
      <p className="rb-numeral mt-2 text-3xl font-semibold">
        {format.number(toMajor(payment.amountMinor, payment.currency))} {payment.currency}
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <button type="button" disabled={busy} onClick={() => answer("success")} className="rounded-[var(--radius-s)] bg-ink px-5 py-3 font-medium text-ink-inverse disabled:opacity-60">
          {t("pay")}
        </button>
        <button type="button" disabled={busy} onClick={() => answer("failure")} className="rounded-[var(--radius-s)] border border-ink px-5 py-3 font-medium text-ink disabled:opacity-60">
          {t("fail")}
        </button>
      </div>
    </div>
  );
}
