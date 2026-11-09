"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { useSession } from "@/context/SessionContext";
import { sectionOf } from "./nav";

/** Pages grouped under one menu entry, as tabs. Only those this person may open. */
export function SectionTabs() {
  const pathname = usePathname();
  const user = useSession();
  const t = useTranslations("common.nav");
  const items = sectionOf(user, pathname);
  if (items.length < 2) return null;
  return (
    <nav aria-label={t("sectionTabs")} className="mb-5 flex flex-wrap gap-x-5 gap-y-2 border-b border-line text-sm">
      {items.map((i) => {
        const current = i.path === pathname;
        return (
          <Link key={i.path} href={i.path} aria-current={current ? "page" : undefined} className={`-mb-px border-b-2 pb-2 ${current ? "border-ink font-medium" : "border-transparent text-ink-muted"}`}>
            {t(i.name)}
          </Link>
        );
      })}
    </nav>
  );
}
