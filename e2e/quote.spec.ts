import { expect, test } from "@playwright/test";

// Quotes created by apps/api/scripts/seed-e2e.ts, all "Quote sent" from Abidjan to
// Niamey, total 1 234 568 XOF. The same link is the customer's tracking page.
const API = process.env.E2E_API_URL ?? "http://localhost:4000";

test.describe("customer quote page", () => {
  test("shows the quote in French, formatted for French", async ({ page }) => {
    await page.goto("/fr/q/e2e-fr");
    await expect(page.getByRole("button", { name: "Accepter" })).toBeVisible();
    // The route is the headline; status is shape + word.
    await expect(page.getByRole("heading", { level: 1, name: "Abidjan → Niamey" })).toBeVisible();
    await expect(page.getByText("Devis envoyé", { exact: true })).toBeVisible();
    await expect(page.getByText(/1\s234\s568 XOF/)).toBeVisible();
    await expect(page.getByText("Perceuse Bosch GSB 18V × 2")).toBeVisible();
  });

  test("shows the quote in English, with no French left", async ({ page }) => {
    await page.goto("/en/q/e2e-en");
    await expect(page.getByRole("button", { name: "Accept", exact: true })).toBeVisible();
    await expect(page.getByText("Quote sent", { exact: true })).toBeVisible();
    await expect(page.getByText("1,234,568 XOF")).toBeVisible();
    await expect(page.getByText("Where your parcel is")).toBeVisible();
    await expect(page.locator("body")).not.toContainText(/Accepter|Refuser|Statut|Commande|Livraison|Mis à jour/);
  });

  test("accepting is confirmed and survives a reload", async ({ page }) => {
    await page.goto("/fr/q/e2e-accept");
    await page.getByRole("button", { name: "Accepter" }).click();
    await expect(page.getByText("Un opérateur vous contactera")).toBeVisible();
    await expect(page.getByRole("button", { name: "Accepter" })).toHaveCount(0);

    await page.reload();
    await expect(page.getByText("Un opérateur vous contactera")).toBeVisible();
    await expect(page.getByRole("button", { name: "Accepter" })).toHaveCount(0);
  });

  test("declining shows the declined status", async ({ page }) => {
    await page.goto("/fr/q/e2e-decline");
    await page.getByRole("button", { name: "Refuser" }).click();
    await expect(page.getByText("Vous avez refusé ce devis.")).toBeVisible();
    await expect(page.getByText("Refusé", { exact: true })).toBeVisible();
  });

  test("an answer given elsewhere is explained, not shown as an error", async ({ page, request }) => {
    await page.goto("/fr/q/e2e-conflict");
    await expect(page.getByRole("button", { name: "Accepter" })).toBeVisible();

    // Declined from another device while this page was open.
    expect((await request.post(`${API}/q/e2e-conflict/decision`, { data: { decision: "decline" } })).status()).toBe(200);

    await page.getByRole("button", { name: "Accepter" }).click();
    await expect(page.getByText("Ce devis a déjà reçu une réponse")).toBeVisible();
    await expect(page.getByText("Refusé", { exact: true })).toBeVisible();
    await expect(page.locator("body")).not.toContainText("can no longer be answered");
  });

  test("an unknown link says so, with nothing to retry", async ({ page }) => {
    await page.goto("/fr/q/does-not-exist");
    await expect(page.getByText("Ce lien de devis est invalide ou a expiré.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Réessayer" })).toHaveCount(0);
  });

  test("a server failure isn't reported as a dead link, and retry recovers", async ({ page }) => {
    await page.route(`${API}/q/e2e-errors`, (route) => route.fulfill({ status: 500, body: "{}" }));
    await page.goto("/fr/q/e2e-errors");
    await expect(page.getByText("Impossible d'afficher votre devis pour le moment")).toBeVisible();
    await expect(page.locator("body")).not.toContainText("invalide ou a expiré");

    await page.unroute(`${API}/q/e2e-errors`);
    await page.getByRole("button", { name: "Réessayer" }).click();
    await expect(page.getByRole("button", { name: "Accepter" })).toBeVisible();
  });

  test("being rate limited says so and offers a retry", async ({ page }) => {
    await page.route(`${API}/q/e2e-errors`, (route) => route.fulfill({ status: 429, body: "{}" }));
    await page.goto("/fr/q/e2e-errors");
    await expect(page.getByText("Trop de tentatives")).toBeVisible();
    await expect(page.getByRole("button", { name: "Réessayer" })).toBeVisible();
  });

  test("a network failure is reported as unavailable", async ({ page }) => {
    await page.route(`${API}/q/e2e-errors`, (route) => route.abort("internetdisconnected"));
    await page.goto("/en/q/e2e-errors");
    await expect(page.getByText("We can't show your quote right now")).toBeVisible();
  });
});

test.describe("public and private surfaces", () => {
  test("the public homepage loads without signing in", async ({ page }) => {
    const res = await page.goto("/fr");
    expect(res?.status()).toBe(200);
  });

  test("the console sends signed-out visitors to the login page", async ({ request }) => {
    for (const [path, login] of [["/fr/orders", "/fr/login"], ["/en/dashboard", "/en/login"]]) {
      const res = await request.get(path, { maxRedirects: 0 });
      expect(res.status()).toBe(307);
      expect(new URL(res.headers().location!, "http://x").pathname).toBe(login);
    }
  });
});
