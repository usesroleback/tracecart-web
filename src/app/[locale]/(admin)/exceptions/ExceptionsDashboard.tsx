"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { api } from "@/lib/apiClient";
import { Badge } from "@/components/ui/badge/Badge";
import { SEVERITY_BADGE } from "@/components/tracecart/OrderExceptions";
import { HubException } from "@/lib/types";
import { useFormat } from "@/lib/format";

const TH = "sticky top-0 whitespace-nowrap border-b border-line bg-surface-sunken px-3 py-2 text-left text-[12px] font-[650] uppercase tracking-[0.04em] text-ink-muted";
const TD = "border-b border-line px-3 py-2 align-top";

/**
 * The hub's open problems, most severe and oldest first: what, on which
 * order, the next action and who owns it. Each row opens its order, where it
 * is worked and resolved.
 */
export function ExceptionsDashboard({ initialExceptions }: { initialExceptions: HubException[] }) {
  const t = useTranslations("orders");
  const tl = useTranslations("labels");
  const f = useFormat();
  const [rows, setRows] = useState(initialExceptions);
  const [showResolved, setShowResolved] = useState(false);

  async function toggle(resolved: boolean) {
    setShowResolved(resolved);
    setRows(await api.get<HubException[]>(resolved ? "/exceptions" : "/exceptions?status=OPEN"));
  }

  return (
    <div>
      <div className="max-w-2xl">
        <h1 className="rb-headline text-[32px]">{t("exceptionsPage.title")}</h1>
        <p className="mt-1 text-sm text-ink-muted">{t("exceptionsPage.subtitle")}</p>
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={showResolved} onChange={(e) => toggle(e.target.checked)} />
          {t("exceptionsPage.showResolved")}
        </label>
        <Link href={{ pathname: "/orders", query: { statut: "exceptions" } }} className="rb-link text-sm">
          {t("exceptionsPage.declined")}
        </Link>
      </div>
      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-ink-muted">{t("exceptionsPage.empty")}</p>
      ) : (
        <div tabIndex={0} className="mt-3 overflow-x-auto rounded-[var(--radius-m)] border border-line bg-surface-raised">
          <table className="w-full min-w-[720px] border-separate border-spacing-0 text-sm">
            <caption className="sr-only">{t("exceptionsPage.caption")}</caption>
            <thead>
              <tr>
                <th className={TH}>{t("exceptionsPage.col.issue")}</th>
                <th className={TH}>{t("exceptionsPage.col.order")}</th>
                <th className={TH}>{t("exceptionsPage.col.next")}</th>
                <th className={TH}>{t("exceptionsPage.col.owner")}</th>
                <th className={TH}>{t("exceptionsPage.col.age")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((x) => (
                <tr key={x.id} className={x.status === "RESOLVED" ? "text-ink-muted" : ""}>
                  <td className={TD}>
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{tl(`exceptionType.${x.type}`)}</span>
                      <Badge variant={x.status === "OPEN" ? SEVERITY_BADGE[x.severity] : "positive"}>
                        {x.status === "OPEN" ? tl(`exceptionSeverity.${x.severity}`) : tl("exceptionStatus.RESOLVED")}
                      </Badge>
                    </span>
                    <span className="block text-[13px]">{x.summary}</span>
                  </td>
                  <td className={TD}>
                    <Link href={`/orders/${x.order.id}`} className="rb-link rb-mono">
                      {x.order.reference}
                    </Link>
                    <span className="block text-[13px] text-ink-muted">
                      {x.order.customerName} · {x.order.destinationCity}
                    </span>
                  </td>
                  <td className={TD}>
                    {x.nextAction ?? "—"}
                    {x.dueAt && <span className="block text-[13px] text-ink-muted">{f.date(x.dueAt)}</span>}
                  </td>
                  <td className={TD}>{x.owner?.name ?? t("exceptionsPage.nobody")}</td>
                  <td className={`${TD} rb-mono text-xs`}>{f.dayTime(x.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
