"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Card } from "@/components/ui/card/Card";
import { useFormat } from "@/lib/format";

export interface WorkItem {
  key: string;
  count: number;
}

// Where each queue is worked. The API says which queues a person has (GET /me/work).
const PATHS: Record<string, string> = {
  shipmentsToPrepare: "/shipments?queue=toPrepare",
  shipmentsNoCarrier: "/shipments?queue=noCarrier",
  shipmentsToMove: "/shipments?queue=toMove",
  parcelsAtPoint: "/shipments?queue=atPoint",
  shipmentProblems: "/shipments?queue=problems",
  cashHeld: "/cod",
  remittancesToConfirm: "/cod",
  paymentsToConfirm: "/store-orders",
  approvalsToDecide: "/refunds",
  refundsToPay: "/refunds",
  returnsToDecide: "/returns?queue=toDecide",
  returnsArriving: "/returns?queue=arriving",
  returnsToInspect: "/returns?queue=toInspect",
  returnsToResolve: "/returns?queue=toResolve",
  purchaseOrdersDraft: "/purchasing",
  inboundToReceive: "/purchasing",
  customsFiles: "/purchasing",
  lowStock: "/inventory",
  countsOpen: "/inventory",
  noticesNew: "/partners",
  freightToQuote: "/freight-requests",
  requestsOpen: "/sourcing",
  productsToFinish: "/catalog",
  sellersToReview: "/sellers?queue=toReview",
  sellerPayoutsToConfirm: "/sellers?queue=payoutToConfirm",
};

/** What's waiting on this person, the fullest queues first. */
export function WorkBoard({ items }: { items: WorkItem[] }) {
  const t = useTranslations("dashboard.work");
  const f = useFormat();
  const known = items.filter((i) => PATHS[i.key]);
  const waiting = known.filter((i) => i.count > 0).sort((a, b) => b.count - a.count);
  const clear = known.filter((i) => i.count === 0);
  if (!known.length) return <p className="mb-6 text-sm text-ink-muted">{t("nothing")}</p>;

  return (
    <section aria-labelledby="work-title" className="mb-6">
      <h2 id="work-title" className="rb-title mb-3 text-[14px]">
        {t("title")}
      </h2>
      {!waiting.length ? <p className="mb-3 text-sm text-ink-muted">{t("allClear")}</p> : null}
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[...waiting, ...clear].map((item) => (
          <li key={item.key}>
            <Link href={PATHS[item.key]} className="block h-full">
              <Card interactive className={`h-full ${item.count === 0 ? "opacity-60" : ""}`}>
                <p className="rb-numeral text-[28px]">{f.number(item.count)}</p>
                <p className="mt-1 text-sm text-ink">{t(`queues.${item.key}` as "queues.lowStock")}</p>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
