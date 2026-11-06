"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import Button from "@/components/ui/button/Button";
import { Field, input } from "@/components/ui/form/Form";
import { box, SignInGate } from "@/components/services/SignInGate";
import { call } from "@/components/checkout/http";

interface Report {
  dryRun: boolean;
  rows: number;
  added: number;
  errors: { line: number; sku: string; messages: string[] }[];
}

const TEMPLATE = "sku,quantity,offer_id\n";

/** Fill the cart from a spreadsheet, then checkout as usual (ADR-068). */
export function BulkCart() {
  const t = useTranslations("b2b.bulk");
  return (
    <SignInGate title={t("signIn")} lead={t("signInLead")}>
      {() => <BulkCartPanel />}
    </SignInGate>
  );
}

function BulkCartPanel() {
  const t = useTranslations("b2b.bulk");
  const [csv, setCsv] = useState<string | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function send(dryRun: boolean) {
    if (!csv) return;
    setBusy(true);
    setError(null);
    try {
      setReport(await call<Report>("POST", "/me/company/cart", { csv, dryRun }));
    } catch (e) {
      setError((e as Error).message);
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
      <div className={`${box} grid gap-3`}>
        <Button
          variant="secondary"
          onClick={() => {
            const url = URL.createObjectURL(new Blob([TEMPLATE], { type: "text/csv;charset=utf-8" }));
            const a = Object.assign(document.createElement("a"), { href: url, download: "tracecart-order.csv" });
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          {t("template")}
        </Button>
        <Field label={t("file")}>
          <input
            className={`${input} py-1.5`}
            type="file"
            accept=".csv,text/csv"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              setReport(null);
              setCsv(file ? await file.text() : null);
            }}
          />
        </Field>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" disabled={!csv} loading={busy} onClick={() => send(true)}>
            {t("check")}
          </Button>
          <Button variant="primary" disabled={!csv || !report?.dryRun || report.errors.length > 0} loading={busy} onClick={() => send(false)}>
            {t("apply")}
          </Button>
        </div>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-critical">
          {error}
        </p>
      ) : null}
      {report ? (
        <div role="status" className={`${box} grid gap-2`}>
          <p className="font-medium">{report.dryRun ? t("checked") : t("imported", { count: report.added })}</p>
          <p className="text-ink-muted">{t("rows", { count: report.rows })}</p>
          {report.errors.length ? (
            <ul className="grid gap-1">
              {report.errors.map((e, i) => (
                <li key={`${e.line}-${e.sku}-${i}`} className="text-critical">
                  {t("rowError", { line: e.line, sku: e.sku, message: e.messages.join("; ") })}
                </li>
              ))}
            </ul>
          ) : null}
          {!report.dryRun && report.added > 0 ? (
            <Link href="/cart" className="text-sm font-medium underline">
              {t("toCart")}
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
