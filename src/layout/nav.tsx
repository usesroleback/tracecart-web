import React from "react";
import { Role, SessionUser } from "../lib/types";
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

export type NavItem = {
  /** Key under common.nav. */
  name: string;
  icon: React.ReactNode;
  /** Path plus an optional tab query (the page reads it, see Orders/Deliveries). */
  path: string;
  query?: Record<string, string>;
  /** Shown only to holders of this permission, or any of these (display only). */
  permission?: string | string[];
  /** And only to these account types, where the leftover service only admits them. */
  accountTypes?: Role[];
  /** STAFF with this permission stand in for the hub admin on that leftover screen (ADR-058). */
  hubPermission?: string;
  /** Only to holders of this role (or any of these): staff hold every staff permission, but a shop isn't theirs. */
  role?: string | string[];
  /** Pages sharing a section are one menu entry, with tabs (ADR-093). */
  section?: string;
  /** On a menu entry standing for a section: the pages it covers. */
  sectionPaths?: string[];
};

export type NavGroup = { /** Key under common.nav.groups. */ title?: string; items: NavItem[] };


// Grouped by the work (ADR-089). One list for everyone: a permission decides what shows.
const NAV: NavGroup[] = [
  {
    items: [
      { icon: <DsHomeIcon />, name: "overview", path: "/dashboard" },
    ],
  },
  {
    title: "sales",
    items: [
      { icon: <DsPackageIcon />, name: "storeOrders", path: "/store-orders", permission: "orders.store.read" },
      { icon: <DsChatIcon />, name: "requests", path: "/sourcing", permission: "sourcing.request.read" },
      { icon: <DsTruckIcon />, name: "freight", path: "/freight-requests", permission: "freight.request.read" },
      { icon: <DsPackageIcon />, name: "returns", path: "/returns", permission: "returns.read" },
      { icon: <DsPackageIcon />, name: "refunds", path: "/refunds", permission: ["payments.read", "orders.refund"] },
      { icon: <DsBuildingIcon />, name: "b2b", path: "/b2b", permission: "customers.b2b.approve" },
    ],
  },
  {
    title: "fulfilment",
    items: [
      { icon: <DsTruckIcon />, name: "shipments", path: "/shipments", permission: "shipments.read" },
      { icon: <DsLayersIcon />, name: "loads", path: "/loads", permission: "logistics.routing.assign" },
      { icon: <DsLayersIcon />, name: "inventory", path: "/inventory", permission: "inventory.read" },
      { icon: <DsPackageIcon />, name: "purchasing", path: "/purchasing", permission: ["purchasing.po.read", "inventory.receive", "customs.file.write"] },
      { icon: <DsPackageIcon />, name: "cash", path: "/cod", permission: ["shipments.cod.collect", "payments.read"] },
    ],
  },
  {
    title: "catalogue",
    items: [
      { icon: <DsLayersIcon />, name: "catalog", section: "catalogueArea", path: "/catalog", permission: "catalog.read" },
      { icon: <DsBookmarkIcon />, name: "categories", section: "catalogueArea", path: "/catalog/categories", permission: "catalog.read" },
      { icon: <DsBuildingIcon />, name: "brands", section: "catalogueArea", path: "/catalog/brands", permission: "catalog.read" },
      { icon: <DsPackageIcon />, name: "catalogImport", section: "catalogueArea", path: "/catalog/import", permission: "catalog.read" },
      { icon: <DsPackageIcon />, name: "listings", path: "/listings", permission: "catalog.listing.review" },
      { icon: <DsSearchIcon />, name: "searchTuning", path: "/catalog/search", permission: "search.tune" },
      { icon: <DsChatIcon />, name: "reviews", path: "/reviews", permission: "content.moderate" },
    ],
  },
  {
    title: "marketing",
    items: [
      { icon: <DsCoinIcon />, name: "coupons", section: "promotions", path: "/coupons", permission: "promotions.write" },
      { icon: <DsCoinIcon />, name: "deals", section: "promotions", path: "/store-deals", permission: "promotions.write" },
      { icon: <DsCoinIcon />, name: "giftCards", section: "promotions", path: "/gift-cards", permission: "promotions.write" },
    ],
  },
  {
    title: "partners",
    items: [
      { icon: <DsBuildingIcon />, name: "sellers", section: "sellersArea", path: "/sellers", permission: "sellers.review" },
      { icon: <DsCoinIcon />, name: "sellerTerms", section: "sellersArea", path: "/sellers/settings", permission: ["sellers.review", "finance.payout.read", "settings.read"] },
      { icon: <DsTruckIcon />, name: "carrierApplications", section: "carriersArea", path: "/carrier-applications", permission: "carriers.review" },
      { icon: <DsTruckIcon />, name: "carriers", section: "carriersArea", path: "/carriers", permission: "logistics.carrier.read", accountTypes: ["SUPER_ADMIN"], hubPermission: "logistics.carrier.read" },
      { icon: <DsBuildingIcon />, name: "partners", path: "/partners", permission: ["partners.notice.handle", "partners.notice.send", "partners.manage"] },
      { icon: <DsCoinIcon />, name: "payouts", path: "/payouts", permission: "finance.payout.read" },
    ],
  },
  {
    title: "finance",
    items: [
      { icon: <DsCoinIcon />, name: "financeOverview", section: "financeArea", path: "/finance", permission: "finance.report.read" },
      { icon: <DsLayersIcon />, name: "ledger", section: "financeArea", path: "/finance/ledger", permission: "finance.report.read" },
      { icon: <DsCoinIcon />, name: "settlementEligibility", section: "financeArea", path: "/finance/eligibility", permission: "finance.payout.read" },
      { icon: <DsTruckIcon />, name: "carrierPayables", section: "financeArea", path: "/finance/carriers", permission: "finance.payout.read" },
    ],
  },
  {
    title: "settings",
    items: [
      { icon: <DsHubIcon />, name: "hub", path: "/hub-setup", permission: ["sourcing.request.read", "pricing.settings.write"] },
      { icon: <DsCoinIcon />, name: "pricing", path: "/pricing", permission: "pricing.settings.write" },
      { icon: <DsLayersIcon />, name: "customs", section: "customsArea", path: "/customs", permission: ["customs.rate.write", "customs.file.write", "compliance.review"] },
      { icon: <DsAlertIcon />, name: "customsReviews", section: "customsArea", path: "/customs/reviews", permission: "customs.file.write" },
      { icon: <DsCoinIcon />, name: "customsRates", section: "customsArea", path: "/customs-rates", permission: "customs.rate.write" },
      { icon: <DsBuildingIcon />, name: "team", path: "/team", permission: "staff.manage" },
      { icon: <DsChatIcon />, name: "customersAdmin", path: "/customers", permission: "customers.read" },
      { icon: <DsLayersIcon />, name: "auditLog", path: "/audit", permission: "audit.read" },
      { icon: <DsAlertIcon />, name: "notificationTemplates", path: "/notification-templates", permission: "settings.notification_template.write" },
    ],
  },
  {
    title: "seller",
    items: [
      { icon: <DsBuildingIcon />, name: "sellerCenter", path: "/seller", role: "seller_owner" },
      { icon: <DsTruckIcon />, name: "sellerOrders", path: "/seller/orders", permission: "seller.order.fulfil", role: ["seller_owner", "seller_staff"] },
      { icon: <DsPackageIcon />, name: "sellerListings", path: "/seller/listings", permission: "seller.listing.write", role: ["seller_owner", "seller_staff"] },
      { icon: <DsLayersIcon />, name: "sellerInbound", path: "/seller/inbounds", permission: "seller.listing.write", role: ["seller_owner", "seller_staff"] },
      { icon: <DsChatIcon />, name: "sellerReviews", path: "/seller/reviews", permission: "seller.listing.write", role: ["seller_owner", "seller_staff"] },
      { icon: <DsCoinIcon />, name: "sellerFinance", path: "/seller/finance", permission: "seller.payout.read", role: "seller_owner" },
      { icon: <DsCoinIcon />, name: "sellerPayouts", path: "/seller/payouts", permission: "seller.payout.read", role: "seller_owner" },
      { icon: <DsBuildingIcon />, name: "sellerStaff", path: "/seller/staff", permission: "seller.settings.write", role: "seller_owner" },
    ],
  },
  {
    title: "partner",
    items: [
      { icon: <DsTruckIcon />, name: "partnerCenter", path: "/partner", role: ["carrier", "pickup_point_operator"] },
      { icon: <DsRouteIcon />, name: "routes", path: "/routes", permission: "logistics.carrier_service.read", accountTypes: ["LOGISTICS_PARTNER"] },
      { icon: <DsPackageIcon />, name: "partnerPickups", path: "/partner/pickups", permission: "shipments.event.record", role: ["carrier", "pickup_point_operator"] },
      { icon: <DsTruckIcon />, name: "partnerDeliveries", path: "/partner/deliveries", permission: "shipments.event.record", role: ["carrier", "pickup_point_operator"] },
      { icon: <DsCoinIcon />, name: "partnerQuotes", path: "/partner/quotes", permission: "orders.carrier_quote.read", role: "carrier" },
      { icon: <DsCoinIcon />, name: "partnerCash", path: "/partner/cash", permission: "shipments.cod.collect", role: ["carrier", "pickup_point_operator"] },
      { icon: <DsCoinIcon />, name: "partnerFinance", path: "/partner/finance", permission: "orders.carrier_quote.read", role: "carrier" },
      { icon: <DsChatIcon />, name: "partnerNotices", path: "/partner/notices", permission: "partners.notice.send", role: ["carrier", "pickup_point_operator"] },
    ],
  },
];

/** What this person is offered: the sidebar, global search and the shortcuts all use it. Display only. */
export function allowedNav(user: SessionUser): NavGroup[] {
  const can = (permission: string) => !!user.permissions?.includes(permission);
  const allowed = (i: NavItem) =>
    (!i.permission || [i.permission].flat().some(can)) &&
    (!i.accountTypes || i.accountTypes.includes(user.role) || (!!i.hubPermission && can(i.hubPermission))) &&
    (!i.role || [i.role].flat().some((r) => !!user.roles?.includes(r)));
  return NAV.map((g) => ({ ...g, items: g.items.filter(allowed) })).filter((g) => g.items.length);
}

/** The sidebar: pages of one section become a single entry, leading to the first one this person may open. */
export function menuNav(user: SessionUser): NavGroup[] {
  return allowedNav(user).map((g) => {
    const seen = new Set<string>();
    const items: NavItem[] = [];
    for (const item of g.items) {
      if (!item.section) {
        items.push(item);
      } else if (!seen.has(item.section)) {
        seen.add(item.section);
        const pages = g.items.filter((i) => i.section === item.section);
        items.push(pages.length > 1 ? { ...item, name: `sections.${item.section}`, sectionPaths: pages.map((i) => i.path) } : item);
      }
    }
    return { ...g, items };
  });
}

/** The pages of the section this path belongs to, that this person may open. */
export function sectionOf(user: SessionUser, pathname: string): NavItem[] {
  const all = allowedNav(user).flatMap((g) => g.items);
  const here = all.find((i) => i.section && i.path === pathname);
  return here ? all.filter((i) => i.section === here.section) : [];
}
