"use client";
import React from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Link, usePathname } from '@/i18n/navigation';
import { useSidebar } from "../context/SidebarContext";
import { useSession } from "../context/SessionContext";
import { nameFromEmail } from "../lib/people";
import { useRoleName } from "../lib/useRoleName";
import { Logo } from "../components/common/Logo";
import { menuNav, NavItem } from "./nav";

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
  const groups = menuNav(user);
  const showLabel = isExpanded || isHovered || isMobileOpen;
  const name = nameFromEmail(user.email);

  // An item is current when its path matches and its tab query (if any) is
  // the one in the URL; a plain item only counts when no tab is selected.
  const isActive = (item: NavItem) => {
    // A product's page belongs to the catalogue list.
    if (pathname.startsWith("/catalog/products")) return item.path === "/catalog";
    if (pathname.startsWith("/store-orders/")) return item.path === "/store-orders";
    if (pathname.startsWith("/freight-requests/")) return item.path === "/freight-requests";
    if (pathname.startsWith("/shipments/")) return item.path === "/shipments";
    if (pathname.startsWith("/returns/")) return item.path === "/returns";
    if (pathname.startsWith("/sellers/") && pathname !== "/sellers/settings") return item.path === "/sellers";
    if (pathname.startsWith("/b2b/")) return item.path === "/b2b";
    if (item.sectionPaths) return item.sectionPaths.includes(pathname);
    const onPath = item.path === "/dashboard" ? pathname === "/dashboard" : pathname === item.path;
    if (!onPath) return false;
    // An item with a tab query is current on that tab; a plain item is current
    // on every other tab of its page (Commandes, except while Exceptions is).
    const matches = (i: NavItem) => Object.entries(i.query ?? {}).every(([k, v]) => search.get(k) === v);
    if (item.query) return matches(item);
    return !groups.some((g) => g.items.some((i) => i.path === item.path && i.query && matches(i)));
  };

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
