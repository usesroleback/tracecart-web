import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { canSignIn, signInAs } from "./signIn";

// Accessibility (ADR-083, PLAN §12: WCAG 2.1 AA): axe checks each page
// against WCAG 2.0 and 2.1 A and AA. No critical or serious violation passes;
// what's left is listed in the test's output for a person to look at.

async function check(page: Page, what: string) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const blocking = results.violations.filter(
    (v) => v.impact === "critical" || v.impact === "serious",
  );
  const minor = results.violations.filter((v) => !blocking.includes(v));
  if (minor.length)
    console.log(
      `[a11y] ${what}: ${minor.map((v) => `${v.id} (${v.impact}, ${v.nodes.length})`).join(", ")}`,
    );
  expect
    .soft(
      blocking.map((v) => ({
        rule: v.id,
        impact: v.impact,
        help: v.help,
        where: v.nodes.slice(0, 3).map((n) => n.target.join(" ")),
      })),
      `${what}: critical or serious accessibility problems`,
    )
    .toEqual([]);
}

const STORE = [
  ["home", "/en"],
  ["home in French", "/fr"],
  ["all departments", "/en/c"],
  ["search", "/en/s?q=perceuse"],
  ["photo and words search", "/en/s/ai"],
  ["deals", "/en/deals"],
  ["parts for my…", "/en/parts"],
  ["cart", "/en/cart"],
  ["freight", "/en/freight"],
  ["sell", "/en/sell"],
  ["carry", "/en/carry"],
  ["about", "/en/about"],
] as const;

for (const [what, path] of STORE) {
  test(`store: ${what}`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    await check(page, what);
  });
}

test("store: a category and a product page", async ({ page }) => {
  await page.goto("/en/c");
  await page.locator('main a[href*="/en/c/"]').first().click();
  await page.waitForLoadState("networkidle");
  await check(page, "category");
  await page.goto("/en/s?q=perceuse");
  await page.locator('main a[href*="/en/p/"]').first().click();
  await expect(page).toHaveURL(/\/en\/p\//);
  await page.waitForLoadState("networkidle");
  await check(page, "product");
});

test.describe("console", () => {
  test.skip(!canSignIn, "Needs a Clerk development instance's keys");

  const CONSOLE = [
    [
      "admin",
      [
        "/en/dashboard",
        "/en/store-orders",
        "/en/shipments",
        "/en/sellers",
        "/en/carrier-applications",
      ],
    ],
    ["customs_officer", ["/en/customs", "/en/customs/reviews"]],
    ["carrier", ["/en/partner", "/en/partner/quotes", "/en/routes"]],
    ["customer", ["/en/account", "/en/account/saved"]],
  ] as const;

  for (const [role, paths] of CONSOLE) {
    test(`${role}'s pages`, async ({ page }) => {
      test.setTimeout(180_000);
      await signInAs(page, role);
      for (const path of paths) {
        await page.goto(path);
        await page.waitForLoadState("networkidle");
        await check(page, `${role} ${path}`);
      }
    });
  }
});
