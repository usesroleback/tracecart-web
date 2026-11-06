"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

/** Home for carriers and pickup points (ADR-054): the work they already have routes for. */
export function PartnerPortal() {
  const t = useTranslations("partners");
  return (
    <div className="max-w-3xl">
      <h1 className="rb-headline mb-1 text-[28px]">{t("portal")}</h1>
      <p className="mb-8 text-sm text-ink-muted">{t("portalLead")}</p>
      <ul className="grid gap-3 sm:grid-cols-2">
        {(
          [
            ["/partner/pickups", "pickupsLink"],
            ["/partner/deliveries", "deliveriesLink"],
            ["/partner/cash", "cashLink"],
            ["/partner/notices", "noticesLink"],
          ] as const
        ).map(([href, key]) => (
          <li key={href}>
            <Link href={href} className="block rounded-[var(--radius-m)] border border-line bg-surface-raised p-5 text-sm font-medium hover:bg-surface-sunken">
              {t(key)}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
