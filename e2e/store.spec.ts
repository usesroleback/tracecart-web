import { expect, test, type Page } from "@playwright/test";

// The store over tracecart-api's demo catalogue (pnpm seed:demo: 202 tools,
// fictional brands, prices in XOF). Phone-sized, like most of its visitors.

type Ld = {
  "@type": string;
  name?: string;
  image?: string[];
  brand?: { name?: string };
  offers?: { "@type": string; price: string; priceCurrency: string; availability: string; itemCondition: string; seller?: { name?: string } }[];
  itemListElement?: { position: number }[];
};

async function jsonLd(page: Page): Promise<Ld[]> {
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  return blocks.map((b) => JSON.parse(b));
}

test.describe("the store", () => {
  test("browses from the home page to a product through a category and a filter", async ({ page }) => {
    await page.goto("/fr");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.getByRole("link", { name: /^Outillage électroportatif/ }).first().click();
    await expect(page).toHaveURL(/\/fr\/c\/power-tools$/);
    await expect(page.getByRole("heading", { level: 1, name: "Outillage électroportatif" })).toBeVisible();

    // Filters fold out on a phone.
    await page.getByText("Filtrer et trier").click();
    await page.getByRole("link", { name: /^Perceuses et visseuses/ }).first().click();
    await expect(page).toHaveURL(/\/fr\/c\/power-tools\/drills-drivers$/);
    const all = Number((await page.getByText(/\d+ produits/).first().textContent())!.match(/\d+/)![0]);

    await page.getByText("Filtrer et trier").click();
    await page.getByRole("link", { name: /Sans fil \(batterie\)/ }).first().click();
    await expect(page).toHaveURL(/attr=power_source%3Acordless/);
    const cordless = Number((await page.getByText(/\d+ produits?/).first().textContent())!.match(/\d+/)![0]);
    expect(cordless).toBeGreaterThan(0);
    expect(cordless).toBeLessThan(all);
    // The filter in force can be removed.
    await expect(page.getByRole("link", { name: /Retirer Alimentation : Sans fil|Retirer Alimentation: Sans fil/ })).toBeVisible();

    await page.locator("article h3 a").first().click();
    await expect(page).toHaveURL(/\/fr\/p\//);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText(/\d[\d\s ]* XOF/).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Caractéristiques" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Demander cet outil" })).toBeVisible();
  });

  test("suggests as one types, and searches past a misspelling", async ({ page }) => {
    await page.goto("/fr/c");
    const box = page.getByRole("combobox", { name: "Rechercher dans le catalogue" });
    await box.fill("meul");
    await expect(page.getByRole("listbox")).toBeVisible();
    await expect(page.getByRole("option", { name: /Meuleuse/ }).first()).toBeVisible();

    await box.fill("perseuse");
    await box.press("Enter");
    await expect(page).toHaveURL(/\/fr\/s\?q=perseuse/);
    await expect(page.getByText("Résultats pour « perceuse »", { exact: false })).toBeVisible();
    await expect(page.locator("article").first()).toContainText(/Perceuse/i);
  });

  test("finds a French tool by its English name (synonyms)", async ({ page }) => {
    await page.goto("/en/s?q=angle%20grinder");
    await expect(page.locator("article").first()).toContainText(/grinder/i);
  });

  test("filters and pages without JavaScript", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto("/en/c/power-tools");
    await page.getByText("Filter and sort").click();
    await page.getByRole("link", { name: /^Voltline/ }).first().click();
    await expect(page).toHaveURL(/brand=voltline/);
    for (const brand of await page.locator("article p.rb-overline").allTextContents()) expect(brand).toBe("Voltline");
    await context.close();
  });

  test("describes products for search engines (schema.org)", async ({ page }) => {
    await page.goto("/en/c/power-tools/drills-drivers");
    await page.locator("article h3 a").first().click();
    await expect(page).toHaveURL(/\/en\/p\//);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const blocks = await jsonLd(page);
    const product = blocks.find((b) => b["@type"] === "Product")!;
    expect(product).toBeTruthy();
    expect(product.name).toBeTruthy();
    expect(product.image?.length).toBeGreaterThan(0);
    expect(product.brand?.name).toBeTruthy();
    expect(product.offers?.length).toBeGreaterThan(0);
    for (const offer of product.offers ?? []) {
      expect(offer["@type"]).toBe("Offer");
      expect(offer.price).toMatch(/^\d+(\.\d+)?$/);
      expect(offer.priceCurrency).toMatch(/^[A-Z]{3}$/);
      expect(offer.availability).toMatch(/^https:\/\/schema\.org\/(InStock|OutOfStock|BackOrder)$/);
      expect(offer.itemCondition).toMatch(/^https:\/\/schema\.org\/\w+Condition$/);
      expect(offer.seller?.name).toBeTruthy();
    }
    const crumbs = blocks.find((b) => b["@type"] === "BreadcrumbList")!.itemListElement ?? [];
    expect(crumbs.map((i) => i.position)).toEqual(crumbs.map((_, i) => i + 1));
    // The page names its canonical address and its other language.
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/en\/p\//);
    await expect(page.locator('link[rel="alternate"][hreflang="fr"]')).toHaveAttribute("href", /\/fr\/p\//);
  });

  test("lists every tool in the sitemap, and every one opens", async ({ request }) => {
    const xml = await (await request.get("/sitemap.xml")).text();
    const products = [...new Set([...xml.matchAll(/<loc>[^<]*?(\/p\/[a-z0-9-]+)<\/loc>/g)].map((m) => m[1]))];
    expect(products.length).toBeGreaterThanOrEqual(200);
    const statuses: number[] = [];
    for (let i = 0; i < products.length; i += 10) {
      statuses.push(...(await Promise.all(products.slice(i, i + 10).map(async (p) => (await request.get(`/fr${p}`)).status()))));
    }
    expect(statuses.every((s) => s === 200)).toBe(true);
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toContain("Sitemap:");
  });

  test("an unknown product is a 404", async ({ request }) => {
    expect((await request.get("/fr/p/no-such-tool")).status()).toBe(404);
  });
});
