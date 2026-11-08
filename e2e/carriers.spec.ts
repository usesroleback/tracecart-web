import { expect, test, type Locator, type Page } from "@playwright/test";
import { button, done, person } from "./order";
import { canSignIn, deleteClerkUser } from "./signIn";

// Carrying for Tracecart (ADR-081, PLAN G5's exit): a carrier registers, is
// approved, sets a route and rates, and quotes a freight shipment, seeing the
// goods and the cities but never the customer or Tracecart's prices.

const pdf = (name: string) => ({ name, mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 test") });

/** A PNG whose text chunk says what it shows: all the API's AI stand-in reads. */
function photo(shows: string): Buffer {
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    return Buffer.concat([len, Buffer.from(type, "latin1"), data, Buffer.alloc(4)]);
  };
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", Buffer.alloc(13)),
    chunk("tEXt", Buffer.concat([Buffer.from("Description"), Buffer.from([0]), Buffer.from(shows, "latin1")])),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/** Chooses the first option whose text contains this. */
async function pick(select: Locator, text: string) {
  const value = await select.locator("option", { hasText: text }).first().getAttribute("value");
  await select.selectOption(value!);
}

test("anyone can read what a carrier must provide", async ({ page }) => {
  await page.goto("/en/carry");
  await expect(page.getByRole("heading", { name: "Carry with Tracecart", level: 1 })).toBeVisible();
  await expect(page.getByText("You'll need: Business registration, Owner's ID, Transport licence.")).toBeVisible();
  await expect(button(page, "Start my application")).toHaveCount(0);
});

test.describe("signed in", () => {
  test.skip(!canSignIn, "Needs a Clerk development instance's keys (CLERK_SECRET_KEY, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)");

  test("a carrier registers, is approved, sets a route and rates, and quotes a shipment", async ({ browser }) => {
    test.setTimeout(480_000);
    const stamp = Date.now();
    const email = `demo.carrier.applicant.${stamp}+clerk_test@example.com`;
    const company = `Fret ${stamp.toString(36)}`;
    const routeName = `${company} Ouaga–Bamako`;
    try {
      // The application.
      const carrier: Page = await person(browser, email);
      await carrier.goto("/en/carry");
      const form = carrier.locator("form").filter({ has: carrier.getByRole("heading", { name: "Your company" }) });
      await form.getByLabel("Company name").fill(company);
      await form.getByRole("combobox", { name: /^Country/ }).selectOption("BF");
      await form.getByRole("textbox", { name: /^City/ }).fill("Ouagadougou");
      await form.getByLabel("Address").fill("Route de Pô, secteur 15");
      await form.getByLabel("Phone").fill("+226 70 00 00 10");
      await form.getByRole("listbox", { name: /^Countries you serve/ }).selectOption(["BF", "ML"]);
      await form.getByLabel("Your vehicles").fill("Three 20-tonne trucks");
      await button(carrier, "Start my application").click();
      await expect(carrier.getByText("Being prepared")).toBeVisible();
      await expect(button(carrier, "Send my application")).toBeDisabled();
      for (const [label, file] of [["Business registration *", "rccm.pdf"], ["Owner's ID *", "cni.pdf"], ["Transport licence *", "licence.pdf"]]) {
        await carrier.getByLabel(label).setInputFiles(pdf(file));
        await expect(carrier.getByRole("link", { name: file })).toBeVisible();
      }
      await button(carrier, "Send my application").click();
      await expect(carrier.getByText("In review")).toBeVisible();

      // A reviewer checks each document, then approves.
      const admin = await person(browser, "admin");
      await admin.goto("/en/carrier-applications?status=SUBMITTED");
      await admin.getByRole("link", { name: company }).click();
      await expect(button(admin, "Approve")).toBeDisabled();
      for (const kind of ["Business registration", "Owner's ID", "Transport licence"]) await admin.getByRole("button", { name: `Accept: ${kind}` }).click();
      await expect(button(admin, "Approve")).toBeEnabled();
      await button(admin, "Approve").click();
      await expect(admin.getByText("Approved", { exact: true }).first()).toBeVisible();
      await done(admin);

      // Its route and rates.
      await carrier.goto("/en/carry");
      await expect(carrier.getByText("Approved", { exact: true })).toBeVisible();
      await carrier.getByRole("link", { name: "My routes and rates" }).click();
      await expect(carrier).toHaveURL(/\/en\/routes$/);
      await button(carrier, "New route").click();
      await carrier.getByLabel("Service name").fill(routeName);
      await pick(carrier.getByLabel("Departure hub"), "Ouagadougou");
      await pick(carrier.getByLabel("Destination hub"), "Bamako");
      await carrier.getByLabel("Transit min (days)").fill("3");
      await carrier.getByLabel("Transit max (days)").fill("5");
      await carrier.getByRole("checkbox", { name: "Tuesday" }).check();
      await carrier.getByLabel("Max load volume (m³)").fill("60");
      await carrier.getByLabel("Amount").first().fill("400");
      await button(carrier, "Save").click();
      await expect(carrier.getByText(routeName)).toBeVisible();
      await expect(carrier.getByText("Leaves Tuesday")).toBeVisible();

      // A customer asks to move goods from Ouagadougou to Bamako.
      const customer = await person(browser, "customer");
      await customer.goto("/en/freight");
      const from = customer.getByRole("group", { name: "Collected from" });
      const to = customer.getByRole("group", { name: "Delivered to" });
      await from.getByRole("combobox", { name: "Country" }).selectOption("BF");
      await from.getByRole("textbox", { name: "City" }).fill("Ouagadougou");
      await to.getByRole("combobox", { name: "Country" }).selectOption("ML");
      await to.getByRole("textbox", { name: "City" }).fill("Bamako");
      await customer.locator('input[type="file"]').setInputFiles([{ name: "a.png", mimeType: "image/png", buffer: photo("3 cartons 45 kg") }]);
      await customer.getByLabel("What it is").fill("3 cartons de pièces détachées, 45 kg");
      await button(customer, "Get an estimate").click();
      await button(customer, "Ask for a firm quote").click();
      const collect = customer.getByRole("group", { name: "Collection in Ouagadougou" });
      await collect.getByLabel("Address").fill("Zone du Bois, rue 12");
      await collect.getByLabel("Contact").fill("Awa Kaboré");
      await collect.getByLabel("Phone").fill("+226 70 11 22 33");
      const deliver = customer.getByRole("group", { name: "Delivery in Bamako" });
      await deliver.getByLabel("Address").fill("ACI 2000");
      await deliver.getByLabel("Contact").fill("Moussa Traoré");
      await deliver.getByLabel("Phone").fill("+223 70 44 55 66");
      await button(customer, "Send the request").click();
      await customer.waitForURL(/\/account\/freight\/FR-/);
      const reference = customer.url().split("/").pop()!;
      await done(customer);

      // Logistics finds the routes that can take it and asks the new carrier.
      const desk = await person(browser, "logistics_coordinator");
      await desk.goto(`/en/freight-requests/${reference}`);
      const carriers = desk.getByRole("region", { name: "Carriers" });
      await carriers.getByRole("checkbox", { name: `Ask ${routeName}` }).check();
      await expect(carriers.getByLabel("The goods")).not.toHaveValue("");
      await button(desk, "Ask 1 carrier").click();
      await expect(carriers.getByText("Waiting").first()).toBeVisible();

      // The carrier sees the goods and the cities, never the customer, and gives its price.
      await carrier.goto("/en/partner/quotes");
      await carrier.getByRole("link", { name: /^CQ-/ }).first().click();
      await expect(carrier.getByText("Ouagadougou, Burkina Faso")).toBeVisible();
      for (const secret of ["Awa", "Moussa", "Zone du Bois", "70 11 22 33"]) await expect(carrier.getByText(secret)).toHaveCount(0);
      await carrier.getByLabel("Amount").fill("40000");
      await carrier.getByLabel("Transit, shortest (days)").fill("3");
      await carrier.getByLabel("Transit, longest (days)").fill("5");
      await button(carrier, "Send my price").click();
      await expect(carrier.getByText("Price given")).toBeVisible();
      await done(carrier);

      // The agent's quote to the customer rests on that price.
      await desk.reload();
      await expect(carriers.getByText("Price received").first()).toBeVisible();
      await carriers.getByRole("button", { name: "Use in the quote" }).click();
      await expect(desk.getByText(`Rests on ${company}'s price: 40,000 XOF.`)).toBeVisible();
      await button(desk, "Send the quote").click();
      await expect(desk.getByText("Sent").first()).toBeVisible();
      await done(desk);
    } finally {
      await deleteClerkUser(email);
    }
  });
});
