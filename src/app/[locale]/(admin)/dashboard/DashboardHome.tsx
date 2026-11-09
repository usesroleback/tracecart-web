"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useSession } from "@/context/SessionContext";
import { WorkBoard, WorkItem } from "@/components/dashboard/WorkBoard";
import { allowedNav } from "@/layout/nav";
import { nameFromEmail } from "@/lib/people";
import { useRoleName } from "@/lib/useRoleName";
import { useFormat } from "@/lib/format";
import { toMajor } from "@/lib/currency";

export interface Overview {
  days: number;
  orders: number;
  inProgress: number;
  delivered: number;
  sales: { currency: string; amountMinor: number }[];
}

const TINTS = ["var(--store-tint-mint)", "var(--store-tint-sky)", "var(--store-tint-butter)", "var(--store-tint-clay)"];

/** Everyone's console home: what's waiting on them, and for those who read orders, how sales are going. */
export function DashboardHome({ work, overview }: { work: WorkItem[]; overview: Overview | null }) {
  const user = useSession();
  const t = useTranslations("dashboard.home");
  const nav = useTranslations("common.nav");
  const roleName = useRoleName(user);
  const f = useFormat();
  const shortcuts = allowedNav(user)
    .flatMap((g) => g.items)
    .filter((i) => i.path !== "/dashboard")
    .slice(0, 8);
  const tiles = overview
    ? [
        { label: t("orders", { days: overview.days }), value: f.number(overview.orders) },
        { label: t("inProgress"), value: f.number(overview.inProgress) },
        { label: t("delivered", { days: overview.days }), value: f.number(overview.delivered) },
        ...overview.sales.map((s) => ({ label: t("sales", { days: overview.days }), value: `${f.number(toMajor(s.amountMinor, s.currency))} ${s.currency}` })),
      ]
    : [];

  return (
    <div>
      <div className="mb-6">
        <p className="rb-overline">{roleName}</p>
        <h1 className="rb-headline text-[32px]">{nameFromEmail(user.email)}</h1>
      </div>

      {tiles.length ? (
        <ul className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {tiles.map((tile, i) => (
            <li key={tile.label + i} style={{ background: TINTS[i % TINTS.length] }} className="rounded-[var(--radius-m)] p-5">
              <p className="rb-numeral text-[30px] text-ink">{tile.value}</p>
              <p className="mt-1 text-sm text-ink">{tile.label}</p>
            </li>
          ))}
        </ul>
      ) : null}

      <WorkBoard items={work} />

      {shortcuts.length ? (
        <section aria-labelledby="shortcuts-title">
          <h2 id="shortcuts-title" className="rb-title mb-3 text-[14px]">
            {t("shortcuts")}
          </h2>
          <ul className="flex flex-wrap gap-2">
            {shortcuts.map((s) => (
              <li key={s.name}>
                <Link href={s.query ? { pathname: s.path, query: s.query } : s.path} className="inline-flex items-center gap-2 rounded-[var(--radius-s)] border border-line bg-surface-raised px-3 py-2 text-sm font-medium text-ink hover:border-ink">
                  <span className="size-4 text-ink-muted [&>svg]:size-4">{s.icon}</span>
                  {nav(s.name)}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
