import { expect, test, type Page } from "@playwright/test";
import { button, person } from "./order";
import { canSignIn, deleteClerkUser, signInAs } from "./signIn";

// Selling on Tracecart (ADR-050): applying, a person's decision, the Seller
// Center, a listing sold and paid out (docs/PLAN.md phase 8's exit), and terms
// that staff change without touching code.

test.skip(!canSignIn, "Needs a Clerk development instance's keys (CLERK_SECRET_KEY, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)");

/** Closes a person's browser once they're done: many at once is a lot for a small machine. */
const done = (page: Page) => page.context().close();

const pdf = (name: string) => ({ name, mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 test") });

test("anyone can read the terms before signing in", async ({ page }) => {
  await page.goto("/en/sell");
  await expect(page.getByRole("heading", { name: "Sell on Tracecart" })).toBeVisible();
  await expect(page.getByText("Tracecart keeps 10 % of each sale.")).toBeVisible();
  await expect(page.getByText("You're paid 14 days after delivery.")).toBeVisible();
  await expect(page.getByText(/You'll need: Business registration, Owner's ID/)).toBeVisible();
  await expect(button(page, "Start my application")).toHaveCount(0);
});

test("from an application to a sale paid out", async ({ browser }) => {
  test.setTimeout(480_000);
  // New people and a new shop each run, removed from Clerk at the end.
  const stamp = Date.now();
  const email = `demo.applicant.${stamp}+clerk_test@example.com`;
  const buyerEmail = `demo.buyer.${stamp}+clerk_test@example.com`;
  const shop = `Quincaillerie ${stamp.toString(36)}`;
  try {
    const context = await browser.newContext();
    const applicant = await context.newPage();
    await signInAs(applicant, email);

    // The application.
    await applicant.goto("/en/sell");
    await applicant.getByLabel("Business name").fill(shop);
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
    await admin.getByRole("link", { name: shop }).click();
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
    await expect(applicant.getByRole("main").getByRole("link", { name: "My payouts" })).toBeVisible();
    await expect(applicant.getByRole("main").getByRole("link", { name: "Staff" })).toBeVisible();
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
    const listingId = applicant.url().split("/").pop()!;

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
    const listing = await applicant.evaluate(async (id) => (await (await fetch(`/api/tracecart/seller/listings/${id}`)).json()) as { product: { slug: string } }, listingId);

    // A customer finds the shop's offer on the product page (cached for a minute) and buys it.
    const buyer = await (await browser.newContext()).newPage();
    await signInAs(buyer, buyerEmail);
    const soldBy = buyer.getByText(`Sold by ${shop}`);
    await expect
      .poll(
        async () => {
          await buyer.goto(`/en/p/${listing.product.slug}`);
          return soldBy.count();
        },
        { timeout: 120_000, intervals: [5_000] }
      )
      .toBe(1);
    const offerBox = soldBy.locator("xpath=ancestor::*[.//button[normalize-space()='Add to cart']][1]");
    if (!(await soldBy.isVisible())) await buyer.getByText(/other offer/).click();
    await offerBox.getByRole("button", { name: "Add to cart" }).click();
    await expect(buyer.getByText("Added to the cart.")).toBeVisible();
    await buyer.goto("/en/checkout");
    await buyer.getByRole("radio", { name: "To a pickup point" }).click();
    await buyer.getByLabel("Country").last().selectOption("BF");
    await buyer.getByRole("radio", { name: /Relais Zogona/ }).check();
    await buyer.getByLabel("Phone for the collection code").fill("+226 70 00 00 02");
    await buyer.getByRole("radio", { name: /Cash on delivery/ }).check();
    const place = button(buyer, /^Place the order · /);
    await expect(place).toBeEnabled();
    const total = (await place.textContent())!.replace(/.*· /, "").replace(/\D/g, "");
    await place.click();
    await buyer.waitForURL(/\/checkout\/done\//);
    const reference = buyer.url().split("/").pop()!;

    // Logistics prepares it from the seller's location and hands it to a carrier.
    const coordinator = await person(browser, "logistics_coordinator");
    await coordinator.goto("/en/shipments");
    await coordinator.getByLabel("Shipment or order reference").fill(reference);
    await button(coordinator, "Search").click();
    const row = coordinator.locator('table a[href*="/shipments/"]');
    await expect(row).toHaveCount(1);
    await row.click();
    await expect(coordinator).toHaveURL(/\/en\/shipments\/[^/]+$/);
    const shipment = new URL(coordinator.url()).pathname;
    await button(coordinator, "Start picking").click();
    await coordinator.getByLabel("Total weight (kg)").fill("1.2");
    await coordinator.getByLabel("Number of packages").fill("1");
    await button(coordinator, "Packed").click();
    await coordinator.getByLabel("Or a carrier with no rate card").selectOption({ label: "Sahel Express Logistique" });
    await coordinator.getByRole("button", { name: "Choose", exact: true }).last().click();
    await button(coordinator, "Make the label").click();
    await expect(coordinator.getByRole("link", { name: "Download the label" })).toBeVisible();
    await button(coordinator, "Handed to the carrier").click();
    await expect(coordinator.getByText("Handed to the carrier").first()).toBeVisible();
    await done(coordinator);

    const carrier = await person(browser, "carrier");
    await carrier.goto(shipment);
    await carrier.getByLabel("What happened?").first().selectOption({ label: "Arrived at the pickup point" });
    await button(carrier, "Record").first().click();
    await expect(carrier.getByText("At the pickup point").first()).toBeVisible();
    await done(carrier);

    await buyer.goto(`/en/account/orders/${reference}`);
    const codeLine = buyer.getByText("Show this code at the pickup point:").locator("..");
    const code = (await codeLine.textContent())!.match(/\d{6}/)![0];
    await done(buyer);
    const point = await person(browser, "pickup_point_operator");
    await point.goto(shipment);
    await point.getByLabel("Customer's code").fill(code);
    await point.getByLabel("Cash taken (XOF)").fill(total);
    await point.getByLabel("Handed to").fill("Aïcha");
    await button(point, "Confirm delivery").click();
    await expect(point.getByText("Cash collected")).toBeVisible();
    await done(point);

    // Delivered. With no hold, finance collects what is due: the sale less 10 %.
    const boss = await person(browser, "super_admin");
    await boss.goto("/en/sellers/settings");
    await boss.getByLabel("Days before paying out").fill("0");
    await button(boss, "Save the terms").click();
    await expect(boss.getByText("Saved.")).toBeVisible();
    const asker = await person(browser, "admin");
    try {
      await asker.goto("/en/payouts");
      await button(asker, "Collect what is due").click();
      await expect(asker.getByRole("link", { name: new RegExp(shop) })).toBeVisible();
    } finally {
      await boss.getByLabel("Days before paying out").fill("14");
      await button(boss, "Save the terms").click();
      await expect(boss.getByText("Saved.")).toBeVisible();
      await done(boss);
    }
    await asker.getByRole("link", { name: new RegExp(shop) }).click();
    await expect(asker.getByText(/22[,.\s\u202f]?500/).first()).toBeVisible();
    await expect(asker.getByText(reference)).toBeVisible();
    await asker.getByLabel("Bank or provider reference").fill("OM-SELLER");
    await button(asker, "Record a transfer").click();
    await expect(asker.getByText("Waiting for approval")).toBeVisible();
    await expect(asker.getByText("You asked for this, so someone else decides.")).toBeVisible();
    await expect(button(asker, "Approve")).toHaveCount(0);
    await done(asker);

    // A second person approves it from their dashboard.
    const finance = await person(browser, "finance");
    await finance.goto("/en/dashboard");
    await finance.getByRole("link", { name: /Seller payouts to approve/ }).click();
    await expect(finance).toHaveURL(/\/en\/payouts\?queue=toApprove$/);
    await finance.getByRole("link", { name: new RegExp(shop) }).click();
    await expect(finance.getByText("Asked: record it as paid by transfer OM-SELLER.")).toBeVisible();
    await button(finance, "Approve").click();
    await expect(finance.getByText("Paid", { exact: true })).toBeVisible();
    await done(finance);

    // The seller sees it paid.
    await applicant.goto("/en/seller/payouts");
    await expect(applicant.getByText("Paid", { exact: true }).first()).toBeVisible();

    // Changing where the money goes needs checking again: it's on the Seller Center's own page.
    await applicant.goto("/en/seller");
    await applicant.getByLabel("Account number").fill("+22699999999");
    await button(applicant, "Save this account").click();
    await expect(applicant.getByText("Payout account to confirm: nothing is paid to it until then.")).toBeVisible();
    await context.close();
  } finally {
    await deleteClerkUser(email);
    await deleteClerkUser(buyerEmail);
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
