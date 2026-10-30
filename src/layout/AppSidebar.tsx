"use client";
import React, { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Link, usePathname } from '@/i18n/navigation';
import { useSidebar } from "../context/SidebarContext";
import { useSession } from "../context/SessionContext";
import { api } from "../lib/apiClient";
import { fetchStatusCounts } from "../lib/kpi/adapter";
import { nameFromEmail } from "../lib/people";
import { OrderStatus } from "../lib/types";
import {
  DsAlertIcon,
  DsBookmarkIcon,
  DsBuildingIcon,
  DsCoinIcon,
  DsChatIcon,
  DsHomeIcon,
  DsHubIcon,
  DsLayersIcon,
  DsPackageIcon,
  DsRouteIcon,
  DsSearchIcon,
  DsTruckIcon,
} from "../icons/index";
import { Logo } from "../components/common/Logo";

type Counts = Partial<Record<OrderStatus, number>> & { sourcing?: number; reservations?: number };

type NavItem = {
  /** Key under common.nav. */
  name: string;
  icon: React.ReactNode;
  /** Path plus an optional tab query (the page reads it, see Orders/Deliveries). */
  path: string;
  query?: Record<string, string>;
  count?: (c: Counts) => number | undefined;
  /** Shown only to holders of this permission (display only). */
  permission?: string;
};

type NavGroup = { /** Key under common.nav.groups. */ title?: string; items: NavItem[] };

const sum = (c: Counts, statuses: OrderStatus[]) => statuses.reduce((n, s) => n + (c[s] ?? 0), 0);
const ACTIVE: OrderStatus[] = ["INTENT_SUBMITTED", "QUOTING", "QUOTED", "QUOTE_SENT", "PAID", "PURCHASED", "RECEIVED_HUB", "CONFIRMED_HUB", "PICKED_UP", "IN_TRANSIT"];

// The operational objects of the design system's TraceCartOps nav
// (Requests → Orders → Exceptions), then what the hub manages.
const ADMIN_NAV: NavGroup[] = [
  {
    title: "operations",
    items: [
      { icon: <DsHomeIcon />, name: "overview", path: "/dashboard" },
      { icon: <DsChatIcon />, name: "requests", path: "/sourcing", count: (c) => c.sourcing },
      { icon: <DsPackageIcon />, name: "orders", path: "/orders", count: (c) => sum(c, ACTIVE) },
      { icon: <DsLayersIcon />, name: "consolidations", path: "/consolidations" },
      { icon: <DsAlertIcon />, name: "exceptions", path: "/exceptions" },
    ],
  },
  {
    title: "catalogue",
    items: [
      { icon: <DsSearchIcon />, name: "products", path: "/products" },
      { icon: <DsBookmarkIcon />, name: "reservations", path: "/reservations", count: (c) => c.reservations },
      { icon: <DsBuildingIcon />, name: "stores", path: "/stores" },
    ],
  },
  {
    title: "network",
    items: [
      { icon: <DsHubIcon />, name: "hub", path: "/hub-setup" },
      { icon: <DsCoinIcon />, name: "pricing", path: "/pricing" },
      { icon: <DsTruckIcon />, name: "carriers", path: "/carriers" },
    ],
  },
];

// The store's catalogue (docs/PLAN.md phase 4), for whoever may see it
// (catalog.read): hub admins and staff such as catalogue managers.
const CATALOG_NAV: NavGroup = {
  title: "store",
  items: [
    { icon: <DsPackageIcon />, name: "storeOrders", path: "/store-orders", permission: "orders.store.read" },
    { icon: <DsLayersIcon />, name: "catalog", path: "/catalog" },
    { icon: <DsBookmarkIcon />, name: "categories", path: "/catalog/categories" },
    { icon: <DsBuildingIcon />, name: "brands", path: "/catalog/brands" },
    { icon: <DsPackageIcon />, name: "catalogImport", path: "/catalog/import" },
    { icon: <DsSearchIcon />, name: "searchTuning", path: "/catalog/search" },
  ],
};

// Staff who aren't hub admins: their areas arrive as each is rebuilt.
const STAFF_NAV: NavGroup[] = [{ items: [{ icon: <DsHomeIcon />, name: "overview", path: "/dashboard" }] }];

// Deliveries, groupages and the carrier's own routes and rates. The steps (à coter, à gérer, en route…) are tabs on Livraisons.
// The count is what's waiting on the carrier: quotes to submit + parcels to handle.
const CARRIER_NAV: NavGroup[] = [
  {
    items: [
      { icon: <DsHomeIcon />, name: "overview", path: "/dashboard" },
      { icon: <DsTruckIcon />, name: "deliveries", path: "/deliveries", count: (c) => sum(c, ["QUOTING", "CONFIRMED_HUB"]) },
      { icon: <DsLayersIcon />, name: "consolidations", path: "/consolidations" },
      { icon: <DsRouteIcon />, name: "routes", path: "/routes" },
    ],
  },
];

/**
 * TraceCartOps side nav (project/components/TraceCartOps/preview.html): the
 * lockup, grouped items with counts, the current item in ink, and who is
 * signed in at the bottom. Collapses to icons on desktop.
 */
const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const pathname = usePathname();
  const search = useSearchParams();
  const user = useSession();
  const t = useTranslations("common.nav");
  const tr = useTranslations("labels.role");
  const [counts, setCounts] = useState<Counts>({});
  const isAdmin = user.role === "SUPER_ADMIN";
  const base = isAdmin ? ADMIN_NAV : user.role === "STAFF" ? STAFF_NAV : CARRIER_NAV;
  const allowed = (i: NavItem) => !i.permission || !!user.permissions?.includes(i.permission);
  const store: NavGroup = {
    ...CATALOG_NAV,
    items: CATALOG_NAV.items.filter((i) => (i.permission ? allowed(i) : !!user.permissions?.includes("catalog.read"))),
  };
  const groups = store.items.length ? [...base, store] : base;
  const showLabel = isExpanded || isHovered || isMobileOpen;
  const name = nameFromEmail(user.email);

  // An item is current when its path matches and its tab query (if any) is
  // the one in the URL; a plain item only counts when no tab is selected.
  const isActive = (item: NavItem) => {
    // An order's own page belongs to the list it was opened from.
    if (pathname.startsWith("/orders/")) return !item.query && item.path === (isAdmin ? "/orders" : "/deliveries");
    // A product's page belongs to the catalogue list.
    if (pathname.startsWith("/catalog/products")) return item.path === "/catalog";
    if (pathname.startsWith("/store-orders/")) return item.path === "/store-orders";
    const onPath = item.path === "/dashboard" ? pathname === "/dashboard" : pathname === item.path;
    if (!onPath) return false;
    // An item with a tab query is current on that tab; a plain item is current
    // on every other tab of its page (Commandes, except while Exceptions is).
    const matches = (i: NavItem) => Object.entries(i.query ?? {}).every(([k, v]) => search.get(k) === v);
    if (item.query) return matches(item);
    return !groups.some((g) => g.items.some((i) => i.path === item.path && i.query && matches(i)));
  };

  useEffect(() => {
    if (isAdmin && !user.hubId) return;
    let cancelled = false;
    Promise.all([
      fetchStatusCounts().catch(() => ({})),
      isAdmin ? api.get<{ total: number }>("/sourcing-requests?limit=1&status=OPEN").catch(() => null) : null,
      isAdmin ? api.get<{ total: number }>("/reservations?limit=1&status=RESERVED").catch(() => null) : null,
    ]).then(([statusCounts, sourcing, reservations]) => {
      if (cancelled) return;
      setCounts({ ...statusCounts, sourcing: sourcing?.total, reservations: reservations?.total });
    });
    return () => {
      cancelled = true;
    };
  }, [isAdmin, user.hubId]);

  return (
    <aside
      className={`fixed mt-16 flex flex-col lg:mt-0 top-0 left-0 bg-surface-raised border-line text-ink h-screen transition-all duration-300 ease-in-out z-50 border-r
        ${isExpanded || isMobileOpen ? "w-[240px]" : isHovered ? "w-[240px]" : "w-[90px]"}
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={`flex h-[76px] items-center px-5 ${!showLabel ? "lg:justify-center lg:px-0" : ""}`}>
        {showLabel ? <Logo variant="lockup" href="/dashboard" /> : <Logo variant="symbol" height={24} href="/dashboard" />}
      </div>

      <nav aria-label={t("label")} className="no-scrollbar flex-1 overflow-y-auto px-2 pb-4">
        {groups.map((group, gi) => (
          <div key={group.title ?? gi} className={gi > 0 ? "mt-5" : ""}>
            {group.title &&
              (showLabel ? (
                <p className="rb-overline mb-1.5 px-3">{t(`groups.${group.title}`)}</p>
              ) : (
                <div className="mx-auto mb-2 h-px w-6 bg-line" aria-hidden />
              ))}
            <ul className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const active = isActive(item);
                const count = item.count?.(counts);
                const href = item.query ? { pathname: item.path, query: item.query } : item.path;
                return (
                  <li key={item.name}>
                    <Link
                      href={href}
                      aria-current={active ? "page" : undefined}
                      title={showLabel ? undefined : t(item.name)}
                      className={`menu-item group ${active ? "menu-item-active" : "menu-item-inactive"} ${!showLabel ? "lg:justify-center" : ""}`}
                    >
                      <span className={active ? "menu-item-icon-active" : "menu-item-icon-inactive"}>{item.icon}</span>
                      {showLabel && <span className="menu-item-text">{t(item.name)}</span>}
                      {showLabel && count != null && count > 0 && (
                        <span className={`ml-auto text-xs font-[650] tabular-nums ${active ? "text-ink-inverse" : "text-ink-muted"}`}>
                          {count}
                        </span>
                      )}
                      {!showLabel && <span className="sr-only">{t(item.name)}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Who is signed in (TraceCartOps .me): initial on green, name from the email, role. */}
      <div className={`flex items-center gap-2.5 border-t border-line px-5 py-4 ${!showLabel ? "lg:justify-center lg:px-0" : ""}`}>
        <span className="grid h-8 w-8 flex-none place-items-center rounded-full bg-accent text-[13px] font-bold text-on-accent" aria-hidden>
          {name.charAt(0).toUpperCase()}
        </span>
        {showLabel && (
          <span className="min-w-0 text-sm">
            <b className="block truncate font-semibold">{name}</b>
            <span className="block text-xs text-ink-muted">{tr(user.role)}</span>
          </span>
        )}
      </div>
    </aside>
  );
};

export default AppSidebar;
