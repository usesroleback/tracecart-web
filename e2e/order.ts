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
