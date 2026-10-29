"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { api } from "@/lib/apiClient";
import Button from "@/components/ui/button/Button";
import { Field, input } from "@/components/ui/form/Form";

interface Report {
  dryRun: boolean;
  rows: number;
  products: { created: number; updated: number };
  variants: { created: number; updated: number };
  offers: { created: number; updated: number };
  errors: { line: number; sku: string | null; messages: string[] }[];
}

/** CSV in (checked first, then imported) and out. */
export function ImportAdmin({ canImport }: { canImport: boolean }) {
  const t = useTranslations("catalogAdmin.import");
  const [csv, setCsv] = useState<string | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function send(dryRun: boolean) {
    if (!csv) return;
    setBusy(true);
    setError(null);
    try {
      setReport(await api.post<Report>("/admin/catalog/import", { csv, dryRun }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function download() {
    setError(null);
    try {
      const res = await fetch("/api/tracecart/admin/catalog/export", { cache: "no-store" });
      if (!res.ok) throw new Error(`${res.status}`);
      const url = URL.createObjectURL(new Blob([await res.text()], { type: "text/csv;charset=utf-8" }));
      const a = Object.assign(document.createElement("a"), { href: url, download: `tracecart-catalogue-${new Date().toISOString().slice(0, 10)}.csv` });
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <div>
        <h1 className="rb-headline text-[28px]">{t("title")}</h1>
        <p className="mt-1 text-sm text-ink-muted">{t("lead")}</p>
      </div>
      <div>
        <Button variant="secondary" onClick={download}>
          {t("export")}
        </Button>
      </div>
      {canImport ? (
        <div className="flex flex-col gap-3 rounded-[var(--radius-m)] border border-line bg-surface-raised p-5">
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
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-critical">
          {error}
        </p>
      ) : null}
      {report ? (
        <div role="status" className="rounded-[var(--radius-m)] border border-line bg-surface-raised p-5 text-sm">
          <p className="font-medium">{report.dryRun ? t("checked") : t("imported")}</p>
          <p className="mt-1 text-ink-muted">
            {t("summary", {
              rows: report.rows,
              pc: report.products.created,
              pu: report.products.updated,
              vc: report.variants.created,
              vu: report.variants.updated,
              oc: report.offers.created,
              ou: report.offers.updated,
            })}
          </p>
          {report.errors.length ? (
            <>
              <p className="mt-3 text-critical">{t("problems", { count: report.errors.length })}</p>
              <ul className="mt-2 space-y-1">
                {report.errors.map((e) => (
                  <li key={e.line}>
                    <span className="rb-mono-s">{t("line", { line: e.line })}</span>
                    {e.sku ? <span className="rb-mono-s"> · {e.sku}</span> : null} — {e.messages.join("; ")}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
