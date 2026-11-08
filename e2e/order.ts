import { expect, type APIRequestContext, type Browser, type Page } from "@playwright/test";
import { signInAs } from "./signIn";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

/** A person in their own browser, signed in. */
export async function person(browser: Browser, role: string): Promise<Page> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await signInAs(page, role);
  return page;
}

export const button = (page: Page, name: string | RegExp) => page.getByRole("button", { name, exact: typeof name === "string" });

/** Closes a person's browser once they're done: many at once is a lot for a small machine. */
export const done = (page: Page) => page.context().close();

/** At checkout, to a pickup point in Burkina Faso. */
export async function toPickupPoint(customer: Page, phone = "+226 70 00 00 02") {
  await customer.getByRole("radio", { name: "To a pickup point" }).click();
  await customer.getByLabel("Country").last().selectOption("BF");
  await customer.getByRole("radio", { name: /Relais Zogona/ }).check();
  await customer.getByLabel("Phone for the collection code").fill(phone);
}

/**
 * Logistics prepares the order's one shipment and hands it to a carrier, who
 * takes it to the pickup point, where the customer collects it with their code
 * (and the cash, when `cash` is given). Leaves the customer's page open.
 */
export async function deliverAtPickupPoint(browser: Browser, customer: Page, reference: string, cash: string | null) {
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

  await customer.goto(`/en/account/orders/${reference}`);
  const codeLine = customer.getByText("Show this code at the pickup point:").locator("..");
  const code = (await codeLine.textContent())!.match(/\d{6}/)![0];
  const point = await person(browser, "pickup_point_operator");
  await point.goto(shipment);
  await point.getByLabel("Customer's code").fill(code);
  if (cash) await point.getByLabel("Cash taken (XOF)").fill(cash);
  await point.getByLabel("Handed to").fill("Aïcha");
  await button(point, "Confirm delivery").click();
  await expect(point.getByText(cash ? "Cash collected" : "Delivered").first()).toBeVisible();
  await done(point);
}

/** The customer orders something in stock at Ouagadougou, to a pickup point, paying in cash. Gives its reference and total. */
export async function placeOrder(customer: Page, request: APIRequestContext): Promise<{ reference: string; total: string }> {
  const { items } = (await (await request.get(`${API_URL}/catalog/products?limit=50`)).json()) as { items: { slug: string; availability: { city: string | null } }[] };
  const product = items.find((p) => p.availability.city === "Ouagadougou")!;
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
  return { reference: customer.url().split("/").pop()!, total };
}
