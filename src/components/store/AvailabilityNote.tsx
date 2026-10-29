import { getTranslations } from "next-intl/server";
import type { Availability } from "@/lib/store";

const DOT: Record<Availability["kind"], string> = {
  IN_STOCK: "bg-positive",
  SELLER: "bg-positive",
  ABROAD: "bg-ds-info",
  OUT_OF_STOCK: "bg-critical",
};

/**
 * Where it comes from and when it's handed over, as the offer states it:
 * no delivery date until the promise engine gives one at checkout (ADR-028).
 */
export async function AvailabilityNote({ availability, detailed = false }: { availability: Availability; detailed?: boolean }) {
  const t = await getTranslations("store.availability");
  const a = availability;
  const main =
    a.kind === "IN_STOCK" || a.kind === "SELLER"
      ? t(a.kind, { city: a.city ?? "" })
      : t(a.kind);
  const detail =
    a.kind === "ABROAD"
      ? t("abroadDays", { min: a.days.min, max: a.days.max })
      : a.kind === "OUT_OF_STOCK"
        ? null
        : t("handover", { days: a.days.max });
  return (
    <span className="flex flex-col gap-0.5 text-sm">
      <span className="inline-flex items-center gap-2 text-ink">
        <span aria-hidden className={`size-2 shrink-0 rounded-full ${DOT[a.kind]}`} />
        {main}
      </span>
      {detailed && detail ? <span className="pl-4 text-ink-muted">{detail}</span> : null}
    </span>
  );
}
