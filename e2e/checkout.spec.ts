import { expect, test } from "@playwright/test";

// The guest's path to checkout over the demo store. Signing in needs a real
// Clerk instance, which these tests don't have (placeholder keys): placing an
// order is covered by tracecart-api's integration tests (checkout.int.test.ts).

test.describe("cart", () => {
  test("a guest adds a tool, changes the cart, and goes to checkout", async ({ page }) => {
    await page.goto("/fr/c/power-tools/drills-drivers");
    await page.locator("article h3 a").first().click();
    await expect(page).toHaveURL(/\/fr\/p\//);
    const title = (await page.getByRole("heading", { level: 1 }).textContent())!.trim();

    await page.getByLabel("Quantité").first().selectOption("2");
    await page.getByRole("button", { name: "Ajouter au panier" }).first().click();
    await expect(page.getByText("Ajouté au panier.")).toBeVisible();
    // The header's cart link counts what's in it.
    await expect(page.getByRole("link", { name: /Panier, 2 articles/ })).toBeVisible();

    await page.getByRole("link", { name: "Voir le panier" }).click();
    await expect(page).toHaveURL(/\/fr\/cart$/);
    await expect(page.getByRole("link", { name: title })).toBeVisible();
    await expect(page.getByText(/Articles \(2 articles\)/)).toBeVisible();

    await page.getByLabel("Quantité").first().selectOption("1");
    await expect(page.getByText(/Articles \(1 article\)/)).toBeVisible();

    await page.getByRole("button", { name: "Garder pour plus tard" }).click();
    await expect(page.getByRole("heading", { name: "Gardés pour plus tard" })).toBeVisible();
    await expect(page.getByText("Votre panier est vide.")).toBeVisible();
    await page.getByRole("button", { name: "Remettre dans le panier" }).click();
    await expect(page.getByRole("link", { name: "Commander" })).toBeVisible();

    // The cart survives a reload (a guest cart, by its token).
    await page.reload();
    await expect(page.getByRole("link", { name: title })).toBeVisible();

    await page.getByRole("link", { name: "Commander" }).click();
    await expect(page).toHaveURL(/\/fr\/checkout$/);
  });

  test("an empty cart says so", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto("/en/cart");
    await expect(page.getByText("Your cart is empty.")).toBeVisible();
    await context.close();
  });

  test("the old shop address leads to the catalogue", async ({ request }) => {
    const res = await request.get("/fr/shop", { maxRedirects: 0 });
    expect([301, 308]).toContain(res.status());
    expect(res.headers().location).toContain("/fr/c");
  });
});
