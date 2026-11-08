import { expect, test, type Page } from "@playwright/test";
import { button, person, placeOrder } from "./order";
import { canSignIn } from "./signIn";

// The whole way through on the screens, each person in their own browser (docs/PLAN.md
// phase 7's exit): an order reaches a pickup point, is collected with the code and cash,
// the cash reaches finance, and the item comes back and is refunded.

test.skip(!canSignIn, "Needs a Clerk development instance's keys (CLERK_SECRET_KEY, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)");

/** Closes a person's browser once they're done: nine at once is a lot for a small machine. */
const done = (page: Page) => page.context().close();

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
  const customer = await person(browser, "customer");
  const { reference, total } = await placeOrder(customer, request);

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
  await done(coordinator);

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
  await done(carrier);

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

  // The cash reaches finance: everything the point holds, which after other
  // tests can include more than this parcel, so finance checks what was declared.
  await point.goto("/en/cod");
  for (const box of await point.getByRole("checkbox").all()) await box.check();
  const transfer = `OM-JOURNEY-${Date.now().toString(36)}`;
  await point.getByLabel("Transfer reference").fill(transfer);
  await button(point, "Declare as passed on").click();
  await expect(point.getByText("Waiting for finance").first()).toBeVisible();
  await done(point);
  const finance = await person(browser, "finance");
  await finance.goto("/en/cod");
  const remittance = finance.getByRole("listitem").filter({ hasText: `Transfer ${transfer}` }).filter({ hasText: "Waiting for finance" });
  const declared = (await remittance.getByText(/^[\d\s,.]+ XOF$/).first().textContent())!.replace(/\D/g, "");
  expect(Number(declared)).toBeGreaterThanOrEqual(Number(total));
  await remittance.getByLabel("Amount received (XOF)").fill(declared);
  await remittance.getByRole("button", { name: "Confirm receipt" }).click();
  await expect(finance.getByRole("listitem").filter({ hasText: `Transfer ${transfer}` }).getByText("Received", { exact: true })).toBeVisible();

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
  await done(manager);
  await done(operator);

  // Support decides: a defect gets back everything paid.
  const support = await person(browser, "support_lead");
  await support.goto(returned);
  await expect(support.getByLabel("Amount to refund (XOF)")).toHaveValue(total);
  await button(support, "Decide").click();
  await expect(support.getByText("To pay out")).toBeVisible();
  await done(support);

  // Finance pays it, and the customer has the document.
  await finance.goto("/en/refunds");
  await finance.getByLabel("Payment reference").first().fill("OM-BACK");
  await button(finance, "Record as paid").first().click();
  await expect(finance.getByText(/Credit note/).first()).toBeVisible();
  await customer.goto(`/en/account/orders/${reference}`);
  await expect(customer.getByRole("link", { name: /Credit note/ })).toBeVisible();
  await expect(customer.getByRole("listitem").filter({ hasText: /· sent/ })).toBeVisible();
});
