import { expect, test } from "@playwright/test";
import { jsonLdText } from "../src/lib/jsonLd";
import { canSignIn, signInAs } from "./signIn";

// G7 (ADR-083): what the web app sends that keeps pages safe.

const LS = String.fromCharCode(0x2028);

/** Clerk's own sign-in scripts, served from its hosts (about 365 kB): what store pages must not load. */
const isClerkHost = (url: string) => /(^|\.)clerk\.(accounts\.dev|com)$|^clerk\./.test(new URL(url).hostname);

test("structured data can't close its script, whatever a title says", () => {
  const data = {
    name: "Perceuse</script><script>alert(1)</script>",
    note: `a & b > c${LS}d`,
  };
  const text = jsonLdText(data);
  for (const c of ["<", ">", "&", LS]) expect(text.includes(c), c).toBe(false);
  expect(JSON.parse(text)).toEqual(data);
});

test("pages carry the security headers and no framing", async ({ request }) => {
  const res = await request.get("/en");
  const h = res.headers();
  expect(h["x-content-type-options"]).toBe("nosniff");
  expect(h["x-frame-options"]).toBe("DENY");
  expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(h["x-powered-by"]).toBeUndefined();
});

test("a product page's structured data parses and holds no raw markup", async ({
  page,
}) => {
  await page.goto("/en/s?q=perceuse");
  await page.locator('main a[href*="/en/p/"]').first().click();
  await expect(page).toHaveURL(/\/en\/p\//);
  const blocks = await page
    .locator('script[type="application/ld+json"]')
    .allTextContents();
  expect(blocks.length).toBeGreaterThan(0);
  for (const b of blocks) {
    expect(b.toLowerCase().includes("<script")).toBe(false);
    expect(() => JSON.parse(b)).not.toThrow();
  }
});

test("the home page loads no sign-in script; its finder sends a signed-out visitor to sign in, then back", async ({ page }) => {
  const clerkScripts: string[] = [];
  page.on("request", (r) => {
    if (r.resourceType() === "script" && isClerkHost(r.url())) clerkScripts.push(r.url());
  });
  await page.goto("/en");
  await page.waitForLoadState("networkidle");
  expect(clerkScripts).toEqual([]);
  await page.getByLabel("What do you need?").fill("A drill bit for concrete, 8 mm");
  await page.getByRole("button", { name: "Find it →" }).click();
  await expect(page).toHaveURL(/\/en\/account\?return=%2Fen.*%23quote$/);
});

test("a signed-in customer's finder searches at once, still with no sign-in script", async ({ page }) => {
  test.skip(!canSignIn, "Needs a Clerk development instance's keys");
  await signInAs(page, "customer");
  const clerkScripts: string[] = [];
  page.on("request", (r) => {
    if (r.resourceType() === "script" && isClerkHost(r.url())) clerkScripts.push(r.url());
  });
  await page.goto("/en");
  await page.getByLabel("What do you need?").fill("Perceuse-visseuse sans fil 18 V");
  await page.getByRole("button", { name: "Find it →" }).click();
  await expect(page.getByRole("button", { name: /Searching|Find it/ })).toBeVisible();
  await page.waitForLoadState("networkidle");
  await expect(page).toHaveURL(/\/en$/);
  await expect(page.getByText("Create a free account to see the results")).toHaveCount(0);
  expect(clerkScripts).toEqual([]);
});

test("the API proxy refuses changes sent from another site", async ({ request }) => {
  const cross = await request.post("/api/tracecart/me/wishlist", { headers: { Origin: "https://evil.example", "Sec-Fetch-Site": "cross-site", "Content-Type": "application/json" }, data: { sku: "X" } });
  expect(cross.status()).toBe(403);
  expect((await cross.json()).error.code).toBe("CROSS_SITE");
  // Reads still pass (and are refused or answered by the API itself).
  expect((await request.get("/api/tracecart/catalog/currencies", { headers: { "Sec-Fetch-Site": "cross-site" } })).status()).toBe(200);
});
