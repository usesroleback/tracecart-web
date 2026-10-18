"use client";
import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebar } from "../context/SidebarContext";
import { useSession } from "../context/SessionContext";
import { api } from "../lib/apiClient";
import {
  DsHomeIcon,
  DsCompassIcon,
  DsLayersIcon,
  DsBookmarkIcon,
  DsBuildingIcon,
  DsHubIcon,
  DsTruckIcon,
} from "../icons/index";
import { Logo } from "../components/common/Logo";

type NavCountKey = "sourcing" | "reservations";

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path: string;
  countKey?: NavCountKey;
};

const SUPER_ADMIN_ITEMS: NavItem[] = [
  { icon: <DsHomeIcon />, name: "Accueil", path: "/dashboard" },
  { icon: <DsCompassIcon />, name: "Sourcing", path: "/sourcing", countKey: "sourcing" },
  { icon: <DsLayersIcon />, name: "Produits", path: "/products" },
  { icon: <DsBookmarkIcon />, name: "Réservations", path: "/reservations", countKey: "reservations" },
  { icon: <DsBuildingIcon />, name: "Boutiques", path: "/stores" },
  { icon: <DsHubIcon />, name: "Mon hub", path: "/hub-setup" },
];

const PARTNER_ITEMS: NavItem[] = [
  { icon: <DsHomeIcon />, name: "Accueil", path: "/dashboard" },
  { icon: <DsTruckIcon />, name: "Livraisons", path: "/deliveries" },
];

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const pathname = usePathname();
  const user = useSession();
  const [counts, setCounts] = useState<Partial<Record<NavCountKey, number>>>({});

  // Exact match for "/dashboard" (otherwise every route would highlight it via startsWith).
  const isActive = useCallback(
    (path: string) => (path === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(path)),
    [pathname]
  );
  const navItems = user.role === "SUPER_ADMIN" ? SUPER_ADMIN_ITEMS : PARTNER_ITEMS;
  const showLabel = isExpanded || isHovered || isMobileOpen;

  useEffect(() => {
    if (user.role !== "SUPER_ADMIN" || !user.hubId) return;
    let cancelled = false;
    Promise.all([
      api.get<{ total: number }>("/sourcing-requests?limit=1&status=OPEN").catch(() => null),
      api.get<{ total: number }>("/reservations?limit=1&status=RESERVED").catch(() => null),
    ]).then(([sourcing, reservations]) => {
      if (cancelled) return;
      setCounts({ sourcing: sourcing?.total, reservations: reservations?.total });
    });
    return () => {
      cancelled = true;
    };
  }, [user.role, user.hubId]);

  return (
    <aside
      className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-3 left-0 bg-surface-raised border-line text-ink h-screen transition-all duration-300 ease-in-out z-50 border-r
        ${isExpanded || isMobileOpen ? "w-[240px]" : isHovered ? "w-[240px]" : "w-[90px]"}
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={`py-8 flex ${!isExpanded && !isHovered ? "lg:justify-center" : "justify-start"} px-2`}>
        <Logo href="/dashboard" />
      </div>
      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav className="mb-6">
          <div className="flex flex-col gap-4">
            <div>
              <h2
                className={`sq-overline mb-3 flex ${
                  !isExpanded && !isHovered ? "lg:justify-center" : "justify-start px-3"
                }`}
              >
                Menu
              </h2>
              <ul className="flex flex-col gap-1">
                {navItems.map((nav) => {
                  const count = nav.countKey ? counts[nav.countKey] : undefined;
                  return (
                    <li key={nav.name}>
                      <Link
                        href={nav.path}
                        className={`menu-item group h-10 ${isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"}`}
                      >
                        <span className={isActive(nav.path) ? "menu-item-icon-active" : "menu-item-icon-inactive"}>
                          {nav.icon}
                        </span>
                        {showLabel && <span className="menu-item-text">{nav.name}</span>}
                        {showLabel && count != null && count > 0 && (
                          <span
                            className={`ml-auto text-xs font-[650] tabular-nums ${
                              isActive(nav.path) ? "text-ink-inverse" : "text-ink-muted"
                            }`}
                          >
                            {count}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </nav>
      </div>
    </aside>
  );
};

export default AppSidebar;
