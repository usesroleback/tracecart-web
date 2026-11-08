import { expect, test, type Page } from "@playwright/test";

// PLAN §14 G4's exit on the screens (ADR-080): a part is never shown as
// verified without evidence. A vehicle, a laptop and an appliance, over the
// demo's parts (fictional brands, real vehicles and devices as targets).

test.use({ viewport: { width: 1360, height: 900 } });

/** The answer inside the "Will it fit?" box (the cart button has its own status line). */
const fitBox = (page: Page) => page.getByRole("region", { name: /^Will it fit your/ });
const fitAnswer = (page: Page) => fitBox(page).getByRole("status");

async function check(page: Page, values: { make: string; model: string; year?: string }) {
  const form = fitBox(page).getByRole("form", { name: "Check it fits" });
  await form.getByLabel(/^Make$|^Brand$/).fill(values.make);
  await form.getByLabel(/^Model$|^Model number$/).fill(values.model);
  if (values.year !== undefined) await form.getByLabel("Year").fill(values.year);
  await form.getByRole("button", { name: "Check" }).click();
  return fitAnswer(page);
}

test("brake pads: verified for a Corolla on its OEM reference, only possible for an Auris, and the year is asked", async ({ page }) => {
  await page.goto("/en/p/ferrona-front-brake-pads-fr-bp140");
  const box = fitBox(page);
  await expect(box.getByRole("heading", { name: "Will it fit your vehicle?" })).toBeVisible();
  await expect(box.getByText("Toyota Corolla 2007–2013")).toBeVisible();
  await expect(box.getByText("Verified · OEM reference (OEM 04465-02220)")).toBeVisible();
  await expect(box.getByText("May fit · seller's word only")).toBeVisible();

  await expect(await check(page, { make: "Toyota", model: "Corolla", year: "2012" })).toContainText("Fits your Toyota Corolla 2012.");
  await expect(page).toHaveURL(/fitMake=Toyota&fitModel=Corolla&fitYear=2012/);
  await expect(await check(page, { make: "Toyota", model: "Auris", year: "2010" })).toContainText("May fit your Toyota Auris 2010.");
  const noYear = await check(page, { make: "Toyota", model: "Corolla", year: "" });
  await expect(noYear).toContainText("To be sure, add: the year.");
  await expect(await check(page, { make: "Toyota", model: "Yaris", year: "2012" })).toContainText("We can't confirm it fits your Toyota Yaris 2012.");
  await expect(fitAnswer(page)).toContainText(/isn't the same as "doesn't fit"/);
});

test("finding parts for a car lists the verified ones first", async ({ page }) => {
  await page.goto("/en/p/ferrona-front-brake-pads-fr-bp140");
  await check(page, { make: "Toyota", model: "Corolla", year: "2012" });
  await page.getByRole("link", { name: "Other parts listed for your Toyota Corolla 2012" }).click();
  await expect(page).toHaveURL(/\/en\/parts\?kind=VEHICLE&make=Toyota&model=Corolla&year=2012/);
  const verified = page.locator("section", { has: page.getByRole("heading", { name: "Verified to fit Toyota Corolla 2012" }) });
  await expect(verified.locator("article h3", { hasText: "Front brake pads FR-BP140" })).toBeVisible();

  // An Auris: the same pads, but only "may fit".
  await page.goto("/en/parts?kind=VEHICLE&make=Toyota&model=Auris&year=2010");
  await expect(page.getByText("No part is verified for it yet.")).toBeVisible();
  const maybe = page.locator("section", { has: page.getByRole("heading", { name: "May fit" }) });
  await expect(maybe.locator("article h3", { hasText: "Front brake pads FR-BP140" })).toBeVisible();
});

test("a laptop charger and a washing machine pump are checked against their model", async ({ page }) => {
  await page.goto("/en/p/kibo-65w-usb-c-laptop-charger-kb-65c");
  await expect(page.getByRole("heading", { name: "Will it fit your device?" })).toBeVisible();
  await expect(await check(page, { make: "Dell", model: "Latitude 5420" })).toContainText("Fits your Dell Latitude 5420.");
  await expect(await check(page, { make: "HP", model: "EliteBook 840 G8" })).toContainText("May fit");

  await page.goto("/en/p/ferrona-drain-pump-fr-dp30");
  await expect(page.getByRole("heading", { name: "Will it fit your appliance?" })).toBeVisible();
  await expect(await check(page, { make: "LG", model: "F4V5VYP0W" })).toContainText("Fits your LG F4V5VYP0W.");
  await expect(fitAnswer(page)).toContainText("tested by Tracecart");
});

test("links between products say whether they're verified", async ({ page }) => {
  await page.goto("/en/c/tools-hardware/spare-parts-batteries/tool-batteries");
  await page.locator("article h3 a").first().click();
  await expect(page.getByText("Verified: a manufacturer document, an OEM reference or a test by Tracecart.").first()).toBeVisible();
  await page.goto("/en/c/tools-hardware");
  await expect(page.getByRole("link", { name: "Parts for my…" })).toHaveAttribute("href", "/en/parts");
});
