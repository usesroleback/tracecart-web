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
import { useRoleName } from "../lib/useRoleName";
import { OrderStatus, Role } from "../lib/types";
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
  /** Shown only to holders of this permission, or any of these (display only). */
  permission?: string | string[];
  /** And only to these account types, where the legacy service only admits them. */
  accountTypes?: Role[];
};

type NavGroup = { /** Key under common.nav.groups. */ title?: string; items: NavItem[] };

const sum = (c: Counts, statuses: OrderStatus[]) => statuses.reduce((n, s) => n + (c[s] ?? 0), 0);
const ACTIVE: OrderStatus[] = ["INTENT_SUBMITTED", "QUOTING", "QUOTED", "QUOTE_SENT", "PAID", "PURCHASED", "RECEIVED_HUB", "CONFIRMED_HUB", "PICKED_UP", "IN_TRANSIT"];

// The operational objects of the design system's TraceCartOps nav
// (Requests → Orders → Exceptions), then what the hub manages, then the store.
// One list for everyone (ADR-048): a permission, plus the account types where
// the legacy service behind an item only admits those.
const NAV: NavGroup[] = [
  {
    title: "operations",
    items: [
      { icon: <DsHomeIcon />, name: "overview", path: "/dashboard" },
      { icon: <DsChatIcon />, name: "requests", path: "/sourcing", permission: "sourcing.request.read", count: (c) => c.sourcing },
      { icon: <DsPackageIcon />, name: "orders", path: "/orders", accountTypes: ["SUPER_ADMIN"], count: (c) => sum(c, ACTIVE) },
      // What's waiting on the carrier: quotes to submit + parcels to handle.
      { icon: <DsTruckIcon />, name: "deliveries", path: "/deliveries", permission: "orders.transition", accountTypes: ["LOGISTICS_PARTNER"], count: (c) => sum(c, ["QUOTING", "CONFIRMED_HUB"]) },
      { icon: <DsLayersIcon />, name: "consolidations", path: "/consolidations", permission: "logistics.consolidation.read", accountTypes: ["SUPER_ADMIN", "LOGISTICS_PARTNER"] },
      { icon: <DsRouteIcon />, name: "routes", path: "/routes", permission: "logistics.carrier_service.read", accountTypes: ["LOGISTICS_PARTNER"] },
      { icon: <DsAlertIcon />, name: "exceptions", path: "/exceptions", accountTypes: ["SUPER_ADMIN"] },
    ],
  },
  {
    title: "catalogue",
    items: [
      { icon: <DsSearchIcon />, name: "products", path: "/products", permission: "sourcing.supplier.search" },
      { icon: <DsBookmarkIcon />, name: "reservations", path: "/reservations", permission: "sourcing.reservation.manage", count: (c) => c.reservations },
      { icon: <DsBuildingIcon />, name: "stores", path: "/stores", permission: "sourcing.supplier.write" },
    ],
  },
  {
    title: "network",
    items: [
      { icon: <DsHubIcon />, name: "hub", path: "/hub-setup", permission: ["sourcing.request.read", "pricing.settings.write"] },
      { icon: <DsCoinIcon />, name: "pricing", path: "/pricing", permission: "pricing.settings.write" },
      { icon: <DsTruckIcon />, name: "carriers", path: "/carriers", accountTypes: ["SUPER_ADMIN"] },
    ],
  },
  {
    title: "store",
    items: [
      { icon: <DsPackageIcon />, name: "storeOrders", path: "/store-orders", permission: "orders.store.read" },
      { icon: <DsTruckIcon />, name: "shipments", path: "/shipments", permission: "shipments.read" },
      { icon: <DsPackageIcon />, name: "cash", path: "/cod", permission: ["shipments.cod.collect", "payments.read"] },
      { icon: <DsLayersIcon />, name: "inventory", path: "/inventory", permission: "inventory.read" },
      { icon: <DsPackageIcon />, name: "purchasing", path: "/purchasing", permission: ["purchasing.po.read", "inventory.receive", "customs.file.write"] },
      { icon: <DsBuildingIcon />, name: "partners", path: "/partners", permission: ["partners.notice.handle", "partners.notice.send", "partners.manage"] },
      { icon: <DsPackageIcon />, name: "returns", path: "/returns", permission: "returns.read" },
      { icon: <DsPackageIcon />, name: "refunds", path: "/refunds", permission: ["payments.read", "orders.refund"] },
      { icon: <DsTruckIcon />, name: "freight", path: "/freight-requests", permission: "freight.request.read" },
      { icon: <DsLayersIcon />, name: "catalog", path: "/catalog", permission: "catalog.read" },
      { icon: <DsBookmarkIcon />, name: "categories", path: "/catalog/categories", permission: "catalog.read" },
      { icon: <DsBuildingIcon />, name: "brands", path: "/catalog/brands", permission: "catalog.read" },
      { icon: <DsPackageIcon />, name: "catalogImport", path: "/catalog/import", permission: "catalog.read" },
      { icon: <DsSearchIcon />, name: "searchTuning", path: "/catalog/search", permission: "search.tune" },
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
  const roleName = useRoleName(user);
  const [counts, setCounts] = useState<Counts>({});
  const isAdmin = user.role === "SUPER_ADMIN";
  const can = (permission: string) => !!user.permissions?.includes(permission);
  const allowed = (i: NavItem) => (!i.permission || [i.permission].flat().some(can)) && (!i.accountTypes || i.accountTypes.includes(user.role));
  const groups = NAV.map((g) => ({ ...g, items: g.items.filter(allowed) })).filter((g) => g.items.length);
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
    if (pathname.startsWith("/freight-requests/")) return item.path === "/freight-requests";
    if (pathname.startsWith("/shipments/")) return item.path === "/shipments";
    if (pathname.startsWith("/returns/")) return item.path === "/returns";
    const onPath = item.path === "/dashboard" ? pathname === "/dashboard" : pathname === item.path;
    if (!onPath) return false;
    // An item with a tab query is current on that tab; a plain item is current
    // on every other tab of its page (Commandes, except while Exceptions is).
    const matches = (i: NavItem) => Object.entries(i.query ?? {}).every(([k, v]) => search.get(k) === v);
    if (item.query) return matches(item);
    return !groups.some((g) => g.items.some((i) => i.path === item.path && i.query && matches(i)));
  };

  const readsOrders = isAdmin || user.role === "LOGISTICS_PARTNER" ? can("orders.read") : false;
  const readsRequests = !!user.hubId && can("sourcing.request.read");
  const readsReservations = !!user.hubId && can("sourcing.reservation.manage");

  useEffect(() => {
    if (isAdmin && !user.hubId) return;
    let cancelled = false;
    Promise.all([
      readsOrders ? fetchStatusCounts().catch(() => ({})) : {},
      readsRequests ? api.get<{ total: number }>("/sourcing-requests?limit=1&status=OPEN").catch(() => null) : null,
      readsReservations ? api.get<{ total: number }>("/reservations?limit=1&status=RESERVED").catch(() => null) : null,
    ]).then(([statusCounts, sourcing, reservations]) => {
      if (cancelled) return;
      setCounts({ ...statusCounts, sourcing: sourcing?.total, reservations: reservations?.total });
    });
    return () => {
      cancelled = true;
    };
  }, [isAdmin, user.hubId, readsOrders, readsRequests, readsReservations]);

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
            <span className="block text-xs text-ink-muted">{roleName}</span>
          </span>
        )}
      </div>
    </aside>
  );
};

export default AppSidebar;
