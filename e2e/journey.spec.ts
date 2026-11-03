import { expect, test, type Browser, type Page } from "@playwright/test";
import { canSignIn, signInAs } from "./signIn";

// The whole way through on the screens, each person in their own browser (docs/PLAN.md
// phase 7's exit): an order reaches a pickup point, is collected with the code and cash,
// the cash reaches finance, and the item comes back and is refunded.

test.skip(!canSignIn, "Needs a Clerk development instance's keys (CLERK_SECRET_KEY, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)");

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

async function person(browser: Browser, role: string): Promise<Page> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await signInAs(page, role);
  return page;
}

const button = (page: Page, name: string | RegExp) => page.getByRole("button", { name, exact: typeof name === "string" });

/** Finds a row by the order's reference on a list that has a search box, and opens it. */
async function openRow(page: Page, list: string, searchLabel: string, reference: string) {
  await page.goto(`/en/${list}`);
  await page.getByLabel(searchLabel).fill(reference);
  await button(page, "Search").click();
  const row = page.locator(`table a[href*="/${list}/"]`);
  await expect(row).toHaveCount(1);
  await row.click();
  await expect(page).toHaveURL(new RegExp(`/en/${list}/[^/]+$`));
}

test("an order from the shelf to the customer's door and back again", async ({ browser, request }) => {
  test.setTimeout(420_000);

  // The customer orders something in stock at Ouagadougou, to a pickup point, paying in cash.
  const { items } = (await (await request.get(`${API_URL}/catalog/products?limit=50`)).json()) as { items: { slug: string; title: string; availability: { city: string | null } }[] };
  const product = items.find((p) => p.availability.city === "Ouagadougou")!;
  const customer = await person(browser, "customer");
  await customer.goto(`/en/p/${product.slug}`);
  await button(customer, "Add to cart").first().click();
  await expect(customer.getByText("Added to the cart.")).toBeVisible();
  await customer.goto("/en/checkout");
  await customer.getByRole("radio", { name: "To a pickup point" }).click();
  await customer.getByLabel("Country").last().selectOption("BF");
  await customer.getByRole("radio", { name: /Relais Zogona/ }).check();
  await customer.getByLabel("Phone for the collection code").fill("+226 70 00 00 00");
  await customer.getByRole("radio", { name: /Cash on delivery/ }).check();
  const place = button(customer, /^Place the order · /);
  await expect(place).toBeEnabled();
  const total = (await place.textContent())!.replace(/.*· /, "").replace(/\D/g, "");
  await place.click();
  await customer.waitForURL(/\/checkout\/done\//);
  const reference = customer.url().split("/").pop()!;

  // The warehouse picks and packs.
  const operator = await person(browser, "warehouse_operator");
  await openRow(operator, "shipments", "Shipment or order reference", reference);
  const shipment = new URL(operator.url()).pathname;
  await button(operator, "Start picking").click();
  await operator.getByLabel("Total weight (kg)").fill("1.2");
  await operator.getByLabel("Number of packages").fill("1");
  await button(operator, "Packed").click();
  await expect(operator.getByRole("button", { name: "Make the label" })).toBeVisible();

  // Logistics chooses the carrier.
  const coordinator = await person(browser, "logistics_coordinator");
  await coordinator.goto(shipment);
  await coordinator.getByLabel("Or a carrier with no rate card").selectOption({ label: "Sahel Express Logistique" });
  await coordinator.getByRole("button", { name: "Choose", exact: true }).last().click();
  await expect(coordinator.getByText("Sahel Express Logistique").first()).toBeVisible();

  // The label, and the hand-off.
  await operator.reload();
  await button(operator, "Make the label").click();
  await expect(operator.getByRole("link", { name: "Download the label" })).toBeVisible();
  await button(operator, "Handed to the carrier").click();
  await expect(operator.getByText("Handed to the carrier").first()).toBeVisible();

  // The carrier takes it on the road, seeing the one figure to collect and no other money.
  const carrier = await person(browser, "carrier");
  await carrier.goto(shipment);
  await expect(carrier.getByText("Cash to collect")).toBeVisible();
  const numbers = (await carrier.locator("main").textContent())!;
  expect(numbers.match(/[\d\s,.]+\s?XOF/g)?.map((m) => m.replace(/\D/g, "")).every((m) => m === total), "the carrier sees no other amount").toBe(true);
  await expect(carrier.getByText(/Costs us/)).toHaveCount(0);
  await carrier.getByLabel("What happened?").first().selectOption({ label: "On its way" });
  await carrier.getByLabel("City").first().fill("Koudougou");
  await button(carrier, "Record").first().click();
  await expect(carrier.getByText("Koudougou").first()).toBeVisible();
  await carrier.getByLabel("What happened?").first().selectOption({ label: "Arrived at the pickup point" });
  await button(carrier, "Record").first().click();
  await expect(carrier.getByText("At the pickup point").first()).toBeVisible();

  // The customer reads their code.
  await customer.goto(`/en/account/orders/${reference}`);
  const codeLine = customer.getByText("Show this code at the pickup point:").locator("..");
  await expect(codeLine).toBeVisible();
  const code = (await codeLine.textContent())!.match(/\d{6}/)![0];

  // The point releases it, for the code and the exact cash.
  const point = await person(browser, "pickup_point_operator");
  await point.goto(shipment);
  await point.getByLabel("Customer's code").fill(code);
  await point.getByLabel("Cash taken (XOF)").fill(total);
  await point.getByLabel("Handed to").fill("Aïcha");
  await button(point, "Confirm delivery").click();
  await expect(point.getByText("Cash collected")).toBeVisible();

  // The cash reaches finance.
  await point.goto("/en/cod");
  await point.getByRole("checkbox").first().check();
  await point.getByLabel("Transfer reference").fill("OM-JOURNEY");
  await button(point, "Declare as passed on").click();
  await expect(point.getByText("Waiting for finance").first()).toBeVisible();
  const finance = await person(browser, "finance");
  await finance.goto("/en/cod");
  await finance.getByLabel("Amount received (XOF)").first().fill(total);
  await button(finance, "Confirm receipt").first().click();
  await expect(finance.getByText("Received", { exact: true }).first()).toBeVisible();

  // It doesn't work: the customer sends it back.
  await customer.goto(`/en/account/orders/${reference}`);
  await customer.getByRole("button", { name: "Send something back" }).click();
  await customer.getByRole("checkbox").first().check();
  await customer.getByLabel("Why?").selectOption({ label: "It doesn't work" });
  await button(customer, "Send the request").click();
  await customer.goto("/en/account/returns");
  await expect(customer.getByText("Requested").first()).toBeVisible();

  // The warehouse accepts it.
  const manager = await person(browser, "warehouse_manager");
  await openRow(manager, "returns", "Return or order reference", reference);
  const returned = new URL(manager.url()).pathname;
  await button(manager, "Accept the return").click();
  await expect(manager.getByText("Accepted").first()).toBeVisible();

  // The customer sends it; it arrives and is checked.
  await customer.reload();
  await customer.getByLabel("Carrier's or drop-off reference").fill("BUS-12");
  await button(customer, "I've sent it").click();
  await expect(customer.getByText("On its way back").first()).toBeVisible();
  await operator.goto(returned);
  await button(operator, "Received at the warehouse").click();
  await expect(operator.getByText("Received").first()).toBeVisible();
  await manager.reload();
  await button(manager, "Record the inspection").click();
  await expect(manager.getByText("Checked").first()).toBeVisible();

  // Support decides: a defect gets back everything paid.
  const support = await person(browser, "support_lead");
  await support.goto(returned);
  await expect(support.getByLabel("Amount to refund (XOF)")).toHaveValue(total);
  await button(support, "Decide").click();
  await expect(support.getByText("To pay out")).toBeVisible();

  // Finance pays it, and the customer has the document.
  await finance.goto("/en/refunds");
  await finance.getByLabel("Payment reference").first().fill("OM-BACK");
  await button(finance, "Record as paid").first().click();
  await expect(finance.getByText(/Credit note/).first()).toBeVisible();
  await customer.goto(`/en/account/orders/${reference}`);
  await expect(customer.getByRole("link", { name: /Credit note/ })).toBeVisible();
  await expect(customer.getByRole("listitem").filter({ hasText: /· sent/ })).toBeVisible();
});
