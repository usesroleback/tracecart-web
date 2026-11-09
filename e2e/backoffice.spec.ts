import { expect, test, type Page } from "@playwright/test";
import { canSignIn, signInAs } from "./signIn";

// Each party's back office opens, and nobody reaches another's (ADR-092 to ADR-094).
// Read only: safe on any database.

test.skip(!canSignIn, "Needs a Clerk development instance's keys (CLERK_SECRET_KEY, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)");

const d = (role: string) => `demo.${role}+clerk_test@example.com`;

async function opens(page: Page, path: string, heading: string) {
  await page.goto(path, { timeout: 180_000 });
  await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible({ timeout: 90_000 });
  await expect(page.getByRole("alert").filter({ hasText: /\w/ })).toHaveCount(0);
}

const WORKSPACES: [string, string, string][] = [
  ["finance", "/fr/finance", "Vue financière"],
  ["finance", "/fr/finance/ledger", "Grand livre"],
  ["finance", "/fr/finance/eligibility", "Éligibilité des paiements vendeurs"],
  ["finance", "/fr/finance/carriers", "Dû aux transporteurs"],
  ["super.admin", "/fr/team", "Équipe"],
  ["super.admin", "/fr/audit", "Journal d'audit"],
  ["support.agent", "/fr/customers", "Clients"],
  ["support.agent", "/fr/support", "Service client"],
  ["customer", "/fr/account/support", "Aide"],
  ["customer", "/fr/account/payments", "Mes paiements"],
  ["seller.owner", "/fr/seller/orders", "Commandes à expédier"],
  ["seller.owner", "/fr/seller/finance", "Mes finances"],
  ["carrier", "/fr/partner/finance", "Mes finances"],
  ["admin", "/fr/store-orders?seller=Quincaillerie&country=BF", "Commandes boutique"],
  ["admin", "/fr/shipments?country=BF", "Expéditions"],
];

for (const [role, path, heading] of WORKSPACES) {
  test(`${role} opens ${path}`, async ({ page }) => {
    test.setTimeout(300_000);
    await signInAs(page, d(role));
    await opens(page, path, heading);
  });
}

const FORBIDDEN: [string, string][] = [
  ["seller.owner", "/fr/finance/ledger"],
  ["carrier", "/fr/finance"],
  ["carrier", "/fr/seller/finance"],
  ["seller.owner", "/fr/partner/finance"],
  ["support.agent", "/fr/team"],
  ["finance", "/fr/support"],
];

for (const [role, path] of FORBIDDEN) {
  test(`${role} can't open ${path}`, async ({ page }) => {
    test.setTimeout(300_000);
    await signInAs(page, d(role));
    await page.goto(path, { timeout: 180_000 });
    await expect(page).not.toHaveURL(new RegExp(`${path}$`), { timeout: 60_000 });
  });
}
