import { expect, test } from "@playwright/test";
import { canSignIn, signInAs } from "./signIn";

// PLAN §14 G2's exit on the screens (ADR-078): the home page's collections,
// cards that say who sells, compare, recently viewed, and Save, over the demo
// catalogue. A computer-sized window, where the compare tray has room.

test.use({ viewport: { width: 1360, height: 900 } });

test("the home page offers the departments, photo search and the other services", async ({ page }) => {
  await page.goto("/en");
  await expect(page.getByRole("heading", { name: "Shop by department" })).toBeVisible();
  const departments = page.locator("section", { has: page.getByRole("heading", { name: "Shop by department" }) });
  // Empty departments say so instead of a zero.
  await expect(departments.getByRole("link", { name: /Fashion/ })).toContainText("Nothing yet");
  await expect(departments.getByRole("link", { name: /Tools & Hardware/ })).toContainText(/\d+ products/);
  const photo = page.locator("section", { has: page.getByRole("heading", { name: /See something you like/ }) });
  await expect(photo.getByRole("link", { name: "Search with a photo" })).toHaveAttribute("href", "/en/s/ai");
  await expect(page.getByRole("link", { name: /Get a shipping quote/ })).toHaveAttribute("href", "/en/freight");
  await expect(page.getByRole("link", { name: /Become a seller/ })).toHaveAttribute("href", "/en/sell");
});

test("cards keep to the photo, name and price; two products compare side by side", async ({ page }) => {
  await page.goto("/en/c/tools-hardware/power-tools");
  const cards = page.locator("article");
  await expect(cards.first()).not.toContainText(/Sold by |In stock/);
  const titles = [await cards.nth(0).locator("h3").innerText(), await cards.nth(1).locator("h3").innerText()];

  await cards.nth(0).getByRole("button", { name: /^Compare:/ }).click();
  const tray = page.getByRole("region", { name: "Products to compare" });
  await expect(tray).toContainText("1 of 4 to compare");
  await cards.nth(1).getByRole("button", { name: /^Compare:/ }).click();
  await expect(tray).toContainText("2 of 4 to compare");
  await expect(cards.nth(1).getByRole("button", { name: /^Compare:/ })).toHaveAttribute("aria-pressed", "true");
  await tray.getByRole("link", { name: "Compare" }).click();

  await expect(page).toHaveURL(/\/en\/compare$/);
  const table = page.getByRole("table", { name: "Compare products" });
  for (const title of titles) await expect(table.getByRole("columnheader", { name: title })).toBeVisible();
  await expect(table.getByRole("rowheader", { name: "Price" })).toBeVisible();
  await expect(table.getByRole("rowheader", { name: "Sold by" })).toBeVisible();
  await expect(page.getByText(/doesn't tell you that one product replaces or fits another/)).toBeVisible();

  await table.getByRole("button", { name: `Remove ${titles[0]} from the comparison` }).click();
  await expect(page.getByText("Pick at least one more product to compare.")).toBeVisible();
  await expect(table.getByRole("columnheader", { name: titles[0] })).toHaveCount(0);
});

test("a product viewed shows on the home page until cleared, and search results carry the same card", async ({ page }) => {
  await page.goto("/en/s?q=drill");
  const first = page.locator("article").first();
  await expect(first.getByRole("button", { name: /^Save:/ })).toBeVisible();
  const title = await first.locator("h3").innerText();
  await first.locator("h3 a").click();
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();

  await page.goto("/en");
  const seen = page.locator("section", { has: page.getByRole("heading", { name: "Recently viewed" }) });
  await expect(seen.locator("article h3", { hasText: title })).toBeVisible();
  await seen.getByRole("button", { name: "Clear" }).click();
  await expect(page.getByRole("heading", { name: "Recently viewed" })).toHaveCount(0);
  // Signed out, Save leads to the Saved page, which signs in first and then saves it.
  await page.goto("/en/s?q=drill");
  await page.locator("article").first().getByRole("button", { name: /^Save:/ }).click();
  await expect(page).toHaveURL(/\/en\/account\/saved\?add=/);
  await expect(page.getByRole("button", { name: "Sign in to see what you saved" })).toBeVisible();
});

test("Save keeps a product in the account's Saved list", async ({ page }) => {
  test.skip(!canSignIn, "Needs a Clerk development instance's keys");
  await signInAs(page, "customer");
  await page.goto("/en/c/tools-hardware/power-tools");
  await page.locator("article h3 a").nth(2).click();
  await expect(page).toHaveURL(/\/en\/p\//);
  const title = await page.getByRole("heading", { level: 1 }).innerText();
  const save = page.getByRole("main").getByRole("button", { name: "Save", exact: true });
  const saved = page.getByRole("main").getByRole("button", { name: "Saved", exact: true });
  // From a known state: the demo customer may have saved it on an earlier run.
  await expect(save.or(saved).first()).toBeVisible();
  if (await saved.count()) await saved.click();
  await save.click();
  await expect(saved).toHaveAttribute("aria-pressed", "true");

  await page.goto("/en/account/saved");
  await expect(page.getByRole("link", { name: title })).toBeVisible();
  await page.getByRole("button", { name: `Remove ${title}` }).click();
  await expect(page.getByRole("link", { name: title })).toHaveCount(0);
});
