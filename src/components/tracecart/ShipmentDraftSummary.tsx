"use client";

import { useTranslations } from "next-intl";
import { ShipmentDraft } from "@/lib/types";
import { useFormat } from "@/lib/format";

/** A customer's shipment request as they gave it: from, to, the goods, dates and customs. */
export function ShipmentDraftSummary({ draft }: { draft: ShipmentDraft }) {
  const t = useTranslations("orders");
  const tl = useTranslations("labels");
  const f = useFormat();
  const place = (a: ShipmentDraft["pickup"]) => [a.line1, a.city, a.country].filter(Boolean).join(", ") + (a.contactName || a.phone ? ` · ${[a.contactName, a.phone].filter(Boolean).join(" ")}` : "");
  const dims = [draft.lengthCm, draft.widthCm, draft.heightCm];
  const facts: [string, string | null | undefined][] = [
    [tl("addressKind.PICKUP"), place(draft.pickup)],
    [tl("addressKind.DELIVERY"), place(draft.delivery)],
    [t("shipment.cargo.packages"), draft.packageCount != null ? f.number(draft.packageCount) : null],
    [t("shipment.cargo.weight"), draft.grossWeightKg != null ? f.number(draft.grossWeightKg) : null],
    [t("shipment.cargo.dimensions"), dims.every((d) => d != null) ? dims.map((d) => f.number(d!)).join(" × ") : null],
    [t("shipment.cargo.declaredValue"), draft.declaredValue != null ? f.money(draft.declaredValue, draft.declaredValueCurrency) : null],
    [t("shipment.cargo.flags"), draft.handlingFlags.length ? draft.handlingFlags.map((fl) => tl(`handlingFlag.${fl}`)).join(", ") : null],
    [t("shipment.cargo.readyAt"), draft.readyAt ? f.date(draft.readyAt) : null],
    [t("shipment.cargo.requiredBy"), draft.requiredBy ? `${f.date(draft.requiredBy)}${draft.requiredByIsHard ? ` · ${t("shipment.cargo.hardDeadline")}` : ""}` : null],
    [t("shipment.customs.title"), tl(`customsResponsibility.${draft.customs}`)],
    [t("shipment.customs.documents"), draft.documentsNote],
  ];
  return (
    <dl className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
      {facts
        .filter(([, v]) => v)
        .map(([k, v]) => (
          <div key={k}>
            <dt className="text-xs font-semibold uppercase tracking-[0.04em] text-ink-muted">{k}</dt>
            <dd className="mt-0.5 text-sm text-ink">{v}</dd>
          </div>
        ))}
    </dl>
  );
}
