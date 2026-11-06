import React from "react";
import { OrderStatus, Role, SessionUser } from "../lib/types";
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

export type Counts = Partial<Record<OrderStatus, number>> & { sourcing?: number; reservations?: number };

export type NavItem = {
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
  /** Only to holders of this role (or any of these): staff hold every staff permission, but a shop isn't theirs. */
  role?: string | string[];
};

export type NavGroup = { /** Key under common.nav.groups. */ title?: string; items: NavItem[] };

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
    title: "seller",
    items: [
      { icon: <DsBuildingIcon />, name: "sellerCenter", path: "/seller", role: "seller_owner" },
      { icon: <DsPackageIcon />, name: "sellerListings", path: "/seller/listings", permission: "seller.listing.write", role: ["seller_owner", "seller_staff"] },
      { icon: <DsCoinIcon />, name: "sellerPayouts", path: "/seller/payouts", permission: "seller.payout.read", role: "seller_owner" },
      { icon: <DsBuildingIcon />, name: "sellerStaff", path: "/seller/staff", permission: "seller.settings.write", role: "seller_owner" },
    ],
  },
  {
    title: "partner",
    items: [
      { icon: <DsTruckIcon />, name: "partnerCenter", path: "/partner", role: ["carrier", "pickup_point_operator"] },
      { icon: <DsPackageIcon />, name: "partnerPickups", path: "/partner/pickups", permission: "shipments.event.record", role: ["carrier", "pickup_point_operator"] },
      { icon: <DsTruckIcon />, name: "partnerDeliveries", path: "/partner/deliveries", permission: "shipments.event.record", role: ["carrier", "pickup_point_operator"] },
      { icon: <DsCoinIcon />, name: "partnerCash", path: "/partner/cash", permission: "shipments.cod.collect", role: ["carrier", "pickup_point_operator"] },
      { icon: <DsChatIcon />, name: "partnerNotices", path: "/partner/notices", permission: "partners.notice.send", role: ["carrier", "pickup_point_operator"] },
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
      { icon: <DsBuildingIcon />, name: "sellers", path: "/sellers", permission: "sellers.review" },
      { icon: <DsPackageIcon />, name: "listings", path: "/listings", permission: "catalog.listing.review" },
      { icon: <DsCoinIcon />, name: "payouts", path: "/payouts", permission: "finance.payout.read" },
      { icon: <DsCoinIcon />, name: "sellerTerms", path: "/sellers/settings", permission: ["sellers.review", "finance.payout.read", "settings.read"] },
      { icon: <DsLayersIcon />, name: "catalog", path: "/catalog", permission: "catalog.read" },
      { icon: <DsBookmarkIcon />, name: "categories", path: "/catalog/categories", permission: "catalog.read" },
      { icon: <DsBuildingIcon />, name: "brands", path: "/catalog/brands", permission: "catalog.read" },
      { icon: <DsPackageIcon />, name: "catalogImport", path: "/catalog/import", permission: "catalog.read" },
      { icon: <DsSearchIcon />, name: "searchTuning", path: "/catalog/search", permission: "search.tune" },
    ],
  },
];

/** What this person is offered: the sidebar, global search and the shortcuts all use it. Display only. */
export function allowedNav(user: SessionUser): NavGroup[] {
  const can = (permission: string) => !!user.permissions?.includes(permission);
  const allowed = (i: NavItem) =>
    (!i.permission || [i.permission].flat().some(can)) && (!i.accountTypes || i.accountTypes.includes(user.role)) && (!i.role || [i.role].flat().some((r) => !!user.roles?.includes(r)));
  return NAV.map((g) => ({ ...g, items: g.items.filter(allowed) })).filter((g) => g.items.length);
}
