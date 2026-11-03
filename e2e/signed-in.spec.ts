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

// What each kind of person can open, and a few things they mustn't.
const ROLES: { role: string; opens: string[]; refused: string[] }[] = [
  {
    role: "super_admin",
    opens: ["/dashboard", "/orders", "/store-orders", "/shipments", "/cod", "/returns", "/refunds", "/inventory", "/purchasing", "/partners", "/catalog", "/freight-requests"],
    refused: ["/deliveries"],
  },
  { role: "warehouse_manager", opens: ["/dashboard", "/store-orders", "/shipments", "/returns", "/inventory", "/purchasing"], refused: ["/refunds", "/catalog", "/partners", "/cod"] },
  { role: "warehouse_operator", opens: ["/shipments", "/returns", "/inventory", "/purchasing"], refused: ["/store-orders", "/refunds", "/catalog", "/partners"] },
  { role: "logistics_coordinator", opens: ["/store-orders", "/shipments", "/returns", "/inventory", "/purchasing", "/partners", "/freight-requests"], refused: ["/refunds", "/catalog"] },
  { role: "finance", opens: ["/store-orders", "/cod", "/refunds", "/purchasing"], refused: ["/shipments", "/inventory", "/catalog"] },
  { role: "support_agent", opens: ["/store-orders", "/shipments", "/returns", "/refunds", "/freight-requests"], refused: ["/inventory", "/purchasing", "/catalog"] },
  { role: "catalog_manager", opens: ["/catalog", "/catalog/brands", "/catalog/categories", "/catalog/search"], refused: ["/shipments", "/refunds", "/inventory"] },
  { role: "sourcing_agent", opens: ["/purchasing", "/catalog"], refused: ["/shipments", "/refunds"] },
  { role: "carrier", opens: ["/deliveries", "/shipments", "/cod", "/partners"], refused: ["/store-orders", "/refunds", "/inventory", "/catalog"] },
  { role: "pickup_point_operator", opens: ["/shipments", "/cod", "/partners"], refused: ["/store-orders", "/refunds", "/inventory", "/catalog"] },
  { role: "customer", opens: ["/account", "/account/returns"], refused: ["/dashboard", "/store-orders", "/shipments", "/refunds"] },
];

for (const { role, opens: allowed, refused: forbidden } of ROLES) {
  test(`${role} opens their screens, and not the others`, async ({ page }) => {
    test.setTimeout(240_000);
    await signInAs(page, role);
    for (const path of allowed) await opens(page, path);
    for (const path of forbidden) await refused(page, path);
  });
}
