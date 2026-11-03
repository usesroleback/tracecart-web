import { expect, test, type Page } from "@playwright/test";
import { button, person, placeOrder } from "./order";
import { canSignIn } from "./signIn";

// The console's tools on real screens (ADR-049), as the people who'd use them.

test.skip(!canSignIn, "Needs a Clerk development instance's keys (CLERK_SECRET_KEY, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)");

const rowOf = (page: Page, text: string) => page.locator("tbody tr").filter({ hasText: text });

async function csvFrom(page: Page): Promise<string> {
  const [download] = await Promise.all([page.waitForEvent("download"), button(page, "Export to CSV").click()]);
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}

test("from a dashboard tile to a saved view, a file and a bulk action", async ({ browser, request }) => {
  test.setTimeout(240_000);
  const customer = await person(browser, "customer");
  const { reference, total } = await placeOrder(customer, request);
  await customer.context().close();

  const operator = await person(browser, "warehouse_operator");

  // The tile opens exactly what it counted, and says so.
  await operator.goto("/en/dashboard");
  await operator.getByRole("link", { name: /Parcels to prepare/ }).click();
  await expect(operator).toHaveURL(/\/en\/shipments\?queue=toPrepare$/);
  await expect(operator.getByText("Parcels to prepare", { exact: true })).toBeVisible();
  await expect(rowOf(operator, reference)).toHaveCount(1);

  // Filters live in the address: they survive a reload, and can be sent to someone.
  await operator.getByLabel("Shipment or order reference").fill(reference);
  await button(operator, "Search").click();
  await expect(operator).toHaveURL(new RegExp(`q=${reference}`));
  await operator.reload();
  await expect(operator.getByLabel("Shipment or order reference")).toHaveValue(reference);
  await expect(rowOf(operator, reference)).toHaveCount(1);

  // A saved view comes back after a reload, and goes when deleted.
  await operator.getByRole("button", { name: "Save this view" }).click();
  await operator.getByLabel("Name of the view").fill("Mine");
  await button(operator, "Save").click();
  await expect(operator.getByLabel("Saved views")).toHaveValue(/.+/);
  await operator.getByRole("button", { name: "See the whole list" }).click();
  await expect(operator).not.toHaveURL(/queue=/);
  await operator.goto("/en/shipments");
  await operator.getByLabel("Saved views").selectOption({ label: "Mine" });
  await expect(operator).toHaveURL(new RegExp(`q=${reference}`));
  await expect(operator).toHaveURL(/queue=toPrepare/);
  await expect(rowOf(operator, reference)).toHaveCount(1);

  // The list as a file: the same rows, and no money.
  const file = await csvFrom(operator);
  expect(file).toContain(reference);
  expect(file.split("\r\n")).toHaveLength(2);
  expect(file).not.toMatch(/XOF/);

  await button(operator, "Delete this view").click();
  await expect(operator.getByLabel("Saved views")).toHaveCount(0);

  // Several at once: here, one is enough to see it work.
  await operator.getByRole("checkbox", { name: new RegExp(`^Select `) }).first().check();
  await button(operator, "Start picking").click();
  await expect(operator.getByText("1 shipment done.")).toBeVisible();
  await operator.goto(`/en/shipments?q=${reference}`);
  await expect(rowOf(operator, reference).getByText("Being picked")).toBeVisible();

  // Searching from anywhere, with the keyboard.
  await operator.goto("/en/inventory");
  await operator.keyboard.press("Control+k");
  await operator.getByRole("combobox", { name: "Search" }).fill(reference);
  await expect(operator.getByRole("option", { name: /Shipment/ })).toBeVisible();
  // Orders aren't this person's to find.
  await expect(operator.getByRole("option", { name: /^.*Order ·/ })).toHaveCount(0);
  await operator.getByRole("combobox", { name: "Search" }).press("ArrowDown");
  await operator.getByRole("option", { name: /Shipment/ }).click();
  await expect(operator).toHaveURL(/\/en\/shipments\/[0-9a-f-]{36}$/);

  // Shortcuts go where the sidebar goes, and tell what they are.
  await operator.keyboard.press("g");
  await operator.keyboard.press("r");
  await expect(operator).toHaveURL(/\/en\/returns$/);
  await operator.keyboard.press("?");
  await expect(operator.getByRole("dialog", { name: "Keyboard shortcuts" })).toBeVisible();
  await button(operator, "Close").click();
  await expect(operator.getByRole("dialog")).toHaveCount(0);
  // Not while typing: a letter in a box stays a letter.
  await operator.getByLabel("Return or order reference").fill("");
  await operator.getByLabel("Return or order reference").press("g");
  await operator.getByLabel("Return or order reference").press("s");
  await expect(operator).toHaveURL(/\/en\/returns$/);
  await expect(operator.getByLabel("Return or order reference")).toHaveValue("gs");
  await operator.context().close();

  // The order file is finance's, with the customer and the total.
  const finance = await person(browser, "finance");
  await finance.goto(`/en/store-orders?q=${reference}`);
  const orders = await csvFrom(finance);
  expect(orders).toContain(reference);
  expect(orders).toContain(total);
  expect(orders).toContain("demo.customer+clerk_test@example.com");
  await finance.keyboard.press("Control+k");
  await finance.getByRole("combobox", { name: "Search" }).fill(reference);
  await finance.getByRole("option", { name: /Order/ }).click();
  await expect(finance).toHaveURL(/\/en\/store-orders\/[0-9a-f-]{36}$/);
  await finance.context().close();

  // A support agent reads the list, and has no button for the file.
  const support = await person(browser, "support_agent");
  await support.goto("/en/store-orders");
  await expect(rowOf(support, reference)).toHaveCount(1);
  await expect(button(support, "Export to CSV")).toHaveCount(0);
  await support.context().close();
});
