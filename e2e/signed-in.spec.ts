import { expect, test, type Page } from "@playwright/test";
import { canSignIn, signInAs } from "./signIn";

test.skip(!canSignIn, "Needs a Clerk development instance's keys (CLERK_SECRET_KEY, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)");

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

/** Opens a page and checks it really loaded: it stayed there, and nothing the API said was a failure. */
async function opens(page: Page, path: string) {
  const failures: string[] = [];
  const onResponse = (res: { status(): number; url(): string }) => {
    if (res.status() >= 400 && (res.url().startsWith(API_URL) || new URL(res.url()).pathname.startsWith("/api/"))) failures.push(`${res.status()} ${res.url()}`);
  };
  page.on("response", onResponse);
  await page.goto(`/en${path}`);
  await page.waitForLoadState("networkidle");
  page.off("response", onResponse);
  expect(new URL(page.url()).pathname, `${path} kept its address`).toBe(`/en${path}`);
  expect(failures, `${path} called the API without a failure`).toEqual([]);
  await expect(page.getByText(/Something went wrong|Application error/i), `${path} shows no error`).toHaveCount(0);
}

/** Opens a page this role has no business on: it's sent elsewhere. The API refusing it is the API's own tests' job. */
async function refused(page: Page, path: string) {
  await page.goto(`/en${path}`);
  await page.waitForLoadState("networkidle");
  expect(new URL(page.url()).pathname, `${path} is refused`).not.toBe(`/en${path}`);
}

const pathsIn = async (page: Page, selector: string) =>
  [...new Set(await page.locator(selector).evaluateAll((links) => links.map((a) => new URL((a as HTMLAnchorElement).href).pathname.replace(/^\/en/, ""))))];

// Who each role is on screen, what its sidebar must show, and a few things it mustn't reach.
const CONSOLE: { role: string; name: string; shows: string[]; refused: string[] }[] = [
  { role: "super_admin", name: "Super Administrator", shows: ["/orders", "/store-orders", "/shipments", "/pricing", "/catalog"], refused: ["/deliveries", "/routes", "/seller"] },
  { role: "admin", name: "Administrator", shows: ["/orders", "/store-orders", "/shipments", "/pricing", "/catalog", "/sellers", "/sellers/settings"], refused: ["/deliveries", "/seller"] },
  { role: "catalog_manager", name: "Catalogue Manager", shows: ["/catalog", "/catalog/search", "/listings"], refused: ["/shipments", "/refunds", "/inventory", "/pricing", "/orders"] },
  { role: "sourcing_agent", name: "Sourcing Agent", shows: ["/sourcing", "/products", "/reservations", "/stores", "/purchasing", "/catalog"], refused: ["/shipments", "/refunds", "/pricing", "/orders"] },
  { role: "pricing_analyst", name: "Pricing Analyst", shows: ["/pricing", "/catalog"], refused: ["/shipments", "/refunds", "/orders", "/sourcing"] },
  { role: "warehouse_manager", name: "Warehouse Manager", shows: ["/store-orders", "/shipments", "/returns", "/inventory", "/purchasing"], refused: ["/refunds", "/catalog", "/partners", "/cod", "/orders"] },
  { role: "warehouse_operator", name: "Warehouse Operator", shows: ["/shipments", "/returns", "/inventory", "/purchasing"], refused: ["/store-orders", "/refunds", "/catalog", "/partners", "/orders"] },
  { role: "logistics_coordinator", name: "Logistics Coordinator", shows: ["/store-orders", "/shipments", "/returns", "/inventory", "/purchasing", "/partners", "/freight-requests"], refused: ["/refunds", "/catalog", "/orders", "/consolidations"] },
  { role: "customs_officer", name: "Customs Officer", shows: ["/store-orders", "/purchasing"], refused: ["/shipments", "/refunds", "/inventory", "/pricing"] },
  { role: "support_agent", name: "Support Agent", shows: ["/store-orders", "/shipments", "/returns", "/refunds", "/freight-requests"], refused: ["/inventory", "/purchasing", "/catalog"] },
  { role: "support_lead", name: "Support Lead", shows: ["/store-orders", "/shipments", "/returns", "/refunds"], refused: ["/inventory", "/purchasing", "/catalog"] },
  { role: "finance", name: "Finance", shows: ["/store-orders", "/cod", "/refunds", "/purchasing", "/sellers/settings"], refused: ["/shipments", "/inventory", "/catalog", "/pricing", "/sellers"] },
  { role: "marketing", name: "Marketing", shows: ["/catalog"], refused: ["/store-orders", "/shipments", "/refunds", "/pricing"] },
  { role: "content_moderator", name: "Content Moderator", shows: ["/catalog", "/listings"], refused: ["/store-orders", "/shipments", "/refunds", "/pricing"] },
  { role: "seller_owner", name: "Seller", shows: ["/seller", "/seller/listings"], refused: ["/store-orders", "/shipments", "/catalog", "/refunds", "/orders", "/sellers", "/sellers/settings"] },
  { role: "seller_staff", name: "Seller Staff", shows: ["/seller/listings"], refused: ["/store-orders", "/shipments", "/catalog", "/refunds", "/orders", "/sellers", "/seller"] },
  { role: "carrier", name: "Carrier", shows: ["/deliveries", "/consolidations", "/routes", "/shipments", "/cod", "/partners"], refused: ["/store-orders", "/refunds", "/inventory", "/catalog", "/pricing"] },
  { role: "pickup_point_operator", name: "Pickup Point", shows: ["/shipments", "/cod", "/partners"], refused: ["/deliveries", "/routes", "/consolidations", "/store-orders", "/refunds", "/inventory", "/pricing"] },
];

for (const { role, name, shows, refused: forbidden } of CONSOLE) {
  test(`${role} has a dashboard, and every link they're offered works`, async ({ page }) => {
    test.setTimeout(300_000);
    await signInAs(page, role);
    await opens(page, "/dashboard");
    // Who they are, by their real role. On a phone it sits in the off-canvas sidebar too.
    await expect(page.getByText(name, { exact: true }).first()).toBeAttached();

    const sidebar = await pathsIn(page, 'nav[aria-label="Main navigation"] a');
    expect(sidebar).toEqual(expect.arrayContaining(shows));
    const queues = await pathsIn(page, 'section[aria-labelledby="work-title"] a');
    for (const path of queues) expect(sidebar, `the sidebar leads to ${path} too`).toContain(path);
    for (const path of sidebar) await opens(page, path);
    for (const path of forbidden) {
      expect(sidebar, `${path} isn't offered`).not.toContain(path);
      await refused(page, path);
    }
  });
}

for (const role of ["customer", "b2b_buyer", "b2b_approver", "b2b_admin"]) {
  test(`${role} has their account, and no console`, async ({ page }) => {
    test.setTimeout(180_000);
    await signInAs(page, role);
    await opens(page, "/account");
    await opens(page, "/account/returns");
    for (const path of ["/dashboard", "/store-orders", "/shipments", "/refunds"]) await refused(page, path);
  });
}
