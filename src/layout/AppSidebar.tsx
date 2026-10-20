"use client";
import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Link, usePathname } from '@/i18n/navigation';
import { useSidebar } from "../context/SidebarContext";
import { useSession } from "../context/SessionContext";
import { api } from "../lib/apiClient";
import { fetchStatusCounts } from "../lib/kpi/adapter";
import { ROLE_LABELS, nameFromEmail } from "../lib/people";
import { OrderStatus } from "../lib/types";
import {
  DsAlertIcon,
  DsBookmarkIcon,
  DsBuildingIcon,
  DsChatIcon,
  DsFileIcon,
  DsHomeIcon,
  DsHubIcon,
  DsLayersIcon,
  DsPackageIcon,
  DsSearchIcon,
  DsTruckIcon,
} from "../icons/index";
import { Logo } from "../components/common/Logo";

type Counts = Partial<Record<OrderStatus, number>> & { sourcing?: number; reservations?: number };

type NavItem = {
  name: string;
  icon: React.ReactNode;
  /** Path plus an optional tab query (the page reads it, see Orders/Deliveries). */
  path: string;
  query?: Record<string, string>;
  count?: (c: Counts) => number | undefined;
};

type NavGroup = { title?: string; items: NavItem[] };

const sum = (c: Counts, statuses: OrderStatus[]) => statuses.reduce((n, s) => n + (c[s] ?? 0), 0);
const ACTIVE: OrderStatus[] = ["INTENT_SUBMITTED", "QUOTING", "QUOTED", "QUOTE_SENT", "PAID", "PURCHASED", "RECEIVED_HUB", "CONFIRMED_HUB", "PICKED_UP", "IN_TRANSIT"];

// The operational objects of the design system's TraceCartOps nav
// (Requests → Orders → Exceptions), then what the hub manages.
const ADMIN_NAV: NavGroup[] = [
  {
    title: "Opérations",
    items: [
      { icon: <DsHomeIcon />, name: "Vue d'ensemble", path: "/dashboard" },
      { icon: <DsChatIcon />, name: "Demandes", path: "/sourcing", count: (c) => c.sourcing },
      { icon: <DsPackageIcon />, name: "Commandes", path: "/orders", count: (c) => sum(c, ACTIVE) },
      { icon: <DsAlertIcon />, name: "Exceptions", path: "/orders", query: { statut: "exceptions" } },
    ],
  },
  {
    title: "Catalogue",
    items: [
      { icon: <DsSearchIcon />, name: "Produits", path: "/products" },
      { icon: <DsBookmarkIcon />, name: "Réservations", path: "/reservations", count: (c) => c.reservations },
      { icon: <DsBuildingIcon />, name: "Boutiques", path: "/stores" },
    ],
  },
  { title: "Réseau", items: [{ icon: <DsHubIcon />, name: "Mon hub", path: "/hub-setup" }] },
];

// The carrier's job, in order (docs/partner-flow.md): quote it, collect it
// once the hub confirms, drive it. Each opens Livraisons on that step.
const CARRIER_NAV: NavGroup[] = [
  { items: [{ icon: <DsHomeIcon />, name: "Vue d'ensemble", path: "/dashboard" }] },
  {
    title: "Livraisons",
    items: [
      { icon: <DsFileIcon />, name: "À coter", path: "/deliveries", query: { etape: "quote" }, count: (c) => c.QUOTING },
      { icon: <DsPackageIcon />, name: "À gérer", path: "/deliveries", query: { etape: "ready" }, count: (c) => c.CONFIRMED_HUB },
      { icon: <DsTruckIcon />, name: "En route", path: "/deliveries", query: { etape: "moving" }, count: (c) => sum(c, ["PICKED_UP", "IN_TRANSIT"]) },
      { icon: <DsLayersIcon />, name: "Toutes les livraisons", path: "/deliveries" },
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
  const [counts, setCounts] = useState<Counts>({});
  const isAdmin = user.role === "SUPER_ADMIN";
  const groups = isAdmin ? ADMIN_NAV : CARRIER_NAV;
  const showLabel = isExpanded || isHovered || isMobileOpen;
  const name = nameFromEmail(user.email);

  // An item is current when its path matches and its tab query (if any) is
  // the one in the URL; a plain item only counts when no tab is selected.
  const isActive = (item: NavItem) => {
    // An order's own page belongs to the list it was opened from.
    if (pathname.startsWith("/orders/")) return !item.query && item.path === (isAdmin ? "/orders" : "/deliveries");
    const onPath = item.path === "/dashboard" ? pathname === "/dashboard" : pathname === item.path;
    if (!onPath) return false;
    const key = item.query ? Object.keys(item.query)[0] : isAdmin ? "statut" : "etape";
    const current = search.get(key);
    return item.query ? current === item.query[key] : !current;
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

      <nav aria-label={isAdmin ? "Opérations" : "Livraisons"} className="no-scrollbar flex-1 overflow-y-auto px-2 pb-4">
        {groups.map((group, gi) => (
          <div key={group.title ?? gi} className={gi > 0 ? "mt-5" : ""}>
            {group.title &&
              (showLabel ? (
                <p className="rb-overline mb-1.5 px-3">{group.title}</p>
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
                      title={showLabel ? undefined : item.name}
                      className={`menu-item group ${active ? "menu-item-active" : "menu-item-inactive"} ${!showLabel ? "lg:justify-center" : ""}`}
                    >
                      <span className={active ? "menu-item-icon-active" : "menu-item-icon-inactive"}>{item.icon}</span>
                      {showLabel && <span className="menu-item-text">{item.name}</span>}
                      {showLabel && count != null && count > 0 && (
                        <span className={`ml-auto text-xs font-[650] tabular-nums ${active ? "text-ink-inverse" : "text-ink-muted"}`}>
                          {count}
                        </span>
                      )}
                      {!showLabel && <span className="sr-only">{item.name}</span>}
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
            <span className="block text-xs text-ink-muted">{ROLE_LABELS[user.role]}</span>
          </span>
        )}
      </div>
    </aside>
  );
};

export default AppSidebar;
