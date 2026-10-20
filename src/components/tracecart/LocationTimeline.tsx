import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge/Badge";
import { DsPinIcon } from "@/icons";
import { LocationUpdate } from "@/lib/types";
import { useFormat } from "@/lib/format";

/** Read-only position history — newest first. Shared between the partner's write view and the admin's read-only view. */
export function LocationTimeline({ updates }: { updates: LocationUpdate[] }) {
  const t = useTranslations("orders.location");
  const f = useFormat();
  if (updates.length === 0) {
    return <p className="text-sm text-ink-muted">{t("none")}</p>;
  }

  return (
    <ul className="space-y-2">
      {updates.map((update) => (
        <li key={update.id} className="flex items-start gap-2.5 text-sm">
          <span className="mt-0.5 flex-shrink-0 text-ink-muted">
            <DsPinIcon />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              {update.city && <span className="font-medium text-ink">{update.city}</span>}
              <Badge variant="outline">{update.source === "GPS" ? "GPS" : t("manual")}</Badge>
              <span className="text-xs text-ink-muted">{f.ago(update.recordedAt)}</span>
            </div>
            {update.note && <p className="mt-0.5 text-xs text-ink-muted">{update.note}</p>}
          </div>
        </li>
      ))}
    </ul>
  );
}
