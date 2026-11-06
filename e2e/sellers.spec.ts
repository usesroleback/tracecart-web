import { expect, test } from "@playwright/test";
import { button, person } from "./order";
import { canSignIn, deleteClerkUser, signInAs } from "./signIn";

// Selling on Tracecart (ADR-050): applying, a person's decision, the Seller
// Center, and terms that staff change without touching code.

test.skip(!canSignIn, "Needs a Clerk development instance's keys (CLERK_SECRET_KEY, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)");

const pdf = (name: string) => ({ name, mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 test") });

test("anyone can read the terms before signing in", async ({ page }) => {
  await page.goto("/en/sell");
  await expect(page.getByRole("heading", { name: "Sell on Tracecart" })).toBeVisible();
  await expect(page.getByText("Tracecart keeps 10 % of each sale.")).toBeVisible();
  await expect(page.getByText("You're paid 14 days after delivery.")).toBeVisible();
  await expect(page.getByText(/You'll need: Business registration, Owner's ID/)).toBeVisible();
  await expect(button(page, "Start my application")).toHaveCount(0);
});

test("from an application to a Seller Center", async ({ browser }) => {
  test.setTimeout(240_000);
  // A new person each run, removed from Clerk at the end.
  const email = `demo.applicant.${Date.now()}+clerk_test@example.com`;
  try {
    const context = await browser.newContext();
    const applicant = await context.newPage();
    await signInAs(applicant, email);

    // The application.
    await applicant.goto("/en/sell");
    await applicant.getByLabel("Business name").fill("Quincaillerie Faso");
    await applicant.getByLabel("Country").last().selectOption("BF");
    await applicant.getByRole("textbox", { name: /^City/ }).fill("Ouagadougou");
    await applicant.getByLabel("Address").fill("Avenue Kwame Nkrumah");
    await applicant.getByLabel("Phone").fill("+226 70 00 00 01");
    await button(applicant, "Start my application").click();
    await expect(applicant.getByText("Being prepared")).toBeVisible();
    await expect(applicant.getByText("Still needed before you can send it:")).toBeVisible();
    await expect(button(applicant, "Send for review")).toBeDisabled();

    await applicant.getByLabel("Business registration *").setInputFiles(pdf("registre.pdf"));
    await expect(applicant.getByRole("link", { name: "registre.pdf" })).toBeVisible();
    await applicant.getByLabel("Owner's ID *").setInputFiles(pdf("identite.pdf"));
    await expect(applicant.getByRole("link", { name: "identite.pdf" })).toBeVisible();

    await applicant.getByLabel("Operator or bank").fill("Orange Money");
    await applicant.getByLabel("Account holder").fill("Awa Ouedraogo");
    await applicant.getByLabel("Account number").fill("+22670123456");
    await button(applicant, "Save this account").click();
    await expect(applicant.getByText("Orange Money, ending in 3456.")).toBeVisible();

    await button(applicant, "Send for review").click();
    await expect(applicant.getByText("In review")).toBeVisible();

    // A reviewer sees it from their dashboard, and must check each document.
    const admin = await person(browser, "admin");
    await admin.goto("/en/dashboard");
    await admin.getByRole("link", { name: /Seller applications to review/ }).click();
    await expect(admin).toHaveURL(/\/en\/sellers\?queue=toReview$/);
    await admin.getByRole("link", { name: "Quincaillerie Faso" }).click();
    await expect(admin).toHaveURL(/\/en\/sellers\/[0-9a-f-]{36}$/);
    await expect(admin.getByText("Ending in 3456")).toBeVisible();
    await expect(admin.getByText("+22670123456")).toHaveCount(0);
    await expect(button(admin, "Approve this seller")).toBeDisabled();
    await button(admin, "Show the whole number").click();
    await expect(admin.getByText("+22670123456")).toBeVisible();

    await admin.getByRole("button", { name: "Accept: Business registration" }).click();
    await admin.getByRole("button", { name: "Accept: Owner's ID" }).click();
    await expect(button(admin, "Approve this seller")).toBeEnabled();
    await button(admin, "Approve this seller").click();
    await expect(admin.getByText("Approved").first()).toBeVisible();
    await admin.context().close();

    // Approved: the customer account now has a Seller Center.
    await applicant.reload();
    await expect(applicant.getByText("You can sell on Tracecart.")).toBeVisible();
    await applicant.getByRole("link", { name: "Open the Seller Center" }).click();
    await expect(applicant).toHaveURL(/\/en\/seller$/);
    await expect(applicant.getByRole("heading", { name: "Seller Center" })).toBeVisible();
    await expect(applicant.getByLabel("Business name")).toBeDisabled();

    // A listing on a catalogue product, then a person's approval (ADR-051).
    await applicant.getByRole("link", { name: "My listings" }).click();
    await expect(applicant).toHaveURL(/\/en\/seller\/listings$/);
    await applicant.getByRole("link", { name: "New listing" }).click();
    await applicant.getByLabel("Find a product").fill("Voltline");
    await button(applicant, "Search").click();
    await expect(applicant.getByLabel("Which variant")).toBeVisible();
    await applicant.getByLabel("Price").fill("25000");
    await applicant.getByLabel("How many you have").fill("4");
    await button(applicant, "Save as a draft").click();
    await expect(applicant).toHaveURL(/\/en\/seller\/listings\/[0-9a-f-]{36}$/);
    await button(applicant, "Send for review").click();
    await expect(applicant.getByText("In review")).toBeVisible();

    const reviewer = await person(browser, "catalog_manager");
    await reviewer.goto("/en/dashboard");
    await reviewer.getByRole("link", { name: /Listings to review/ }).click();
    await expect(reviewer).toHaveURL(/\/en\/listings\?queue=toReview$/);
    await reviewer.getByRole("link", { name: /Voltline/ }).first().click();
    await button(reviewer, "Approve this listing").click();
    await expect(reviewer.getByText("On sale").first()).toBeVisible();
    await reviewer.context().close();

    await applicant.reload();
    await expect(applicant.getByText("On sale").first()).toBeVisible();

    // Changing where the money goes needs checking again.
    await applicant.getByLabel("Account number").fill("+22699999999");
    await button(applicant, "Save this account").click();
    await expect(applicant.getByText("Payout account to confirm: nothing is paid to it until then.")).toBeVisible();
    await context.close();
  } finally {
    await deleteClerkUser(email);
  }
});

test("terms change in the console, and everyone sees it", async ({ browser }) => {
  test.setTimeout(180_000);
  const boss = await person(browser, "super_admin");
  await boss.goto("/en/sellers/settings");
  await expect(boss.getByLabel("Default commission (%)")).toHaveValue("10");
  await boss.getByLabel("Default commission (%)").fill("12.5");
  await boss.getByLabel("Days before paying out").fill("21");
  await button(boss, "Save the terms").click();
  await expect(boss.getByText("Saved.")).toBeVisible();

  const visitor = await (await browser.newContext()).newPage();
  await visitor.goto("/en/sell");
  await expect(visitor.getByText("Tracecart keeps 12.5 % of each sale.")).toBeVisible();
  await expect(visitor.getByText("You're paid 21 days after delivery.")).toBeVisible();
  await visitor.context().close();

  // A rate for a category.
  await boss.getByRole("combobox", { name: /^Category/ }).selectOption({ index: 1 });
  await boss.getByRole("textbox", { name: /^Rate/ }).fill("8");
  await button(boss, "Save the rate").click();
  await expect(boss.getByText("8 %")).toBeVisible();
  await button(boss, "Remove").click();
  await expect(boss.getByText("Every category uses the default.")).toBeVisible();

  // Finance reads them, and can't change them.
  const finance = await person(browser, "finance");
  await finance.goto("/en/sellers/settings");
  await expect(finance.getByLabel("Default commission (%)")).toBeDisabled();
  await expect(button(finance, "Save the terms")).toHaveCount(0);
  await finance.context().close();

  // Back as they were, for the other tests.
  await boss.getByLabel("Default commission (%)").fill("10");
  await boss.getByLabel("Days before paying out").fill("14");
  await button(boss, "Save the terms").click();
  await expect(boss.getByText("Saved.")).toBeVisible();
  await boss.context().close();
});
