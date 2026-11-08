import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { button, deliverAtPickupPoint, done, person, toPickupPoint } from "./order";
import { canSignIn, deleteClerkUser, signInAs } from "./signIn";

// PLAN phase 9's exit on the screens: a company order over its limit waits for
// a colleague; a coupon, a deal and a gift card at checkout; a review with a
// photo, moderated, answered by the seller (ADR-060, 062, 063, 070–072).

test.skip(!canSignIn, "Needs a Clerk development instance's keys (CLERK_SECRET_KEY, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)");

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xd9]);

interface Offer {
  id: string;
  seller: { name: string } | null;
  availability: { kind: string; city: string | null };
}
interface Variant {
  sku: string;
  buyBox: Offer | null;
  otherOffers: Offer[];
}

/** A product with an offer that `pick` accepts, from the store's own API. */
async function findProduct(request: APIRequestContext, pick: (v: Variant) => Offer | undefined) {
  const { items } = (await (await request.get(`${API_URL}/catalog/products?limit=50&currency=XOF`)).json()) as { items: { slug: string }[] };
  for (const { slug } of items) {
    const p = (await (await request.get(`${API_URL}/catalog/products/${slug}?currency=XOF`)).json()) as { variants: Variant[] };
    for (const v of p.variants ?? []) {
      const offer = pick(v);
      if (offer) return { slug, sku: v.sku, offer };
    }
  }
  throw new Error("No product matches");
}

const offersOf = (v: Variant) => [v.buyBox, ...v.otherOffers].filter((o): o is Offer => !!o);

/** Adds one offer to the cart from the product page (cached for a minute: retried until it shows). */
async function addFromProductPage(customer: Page, slug: string, soldBy: string) {
  const line = customer.getByText(soldBy, { exact: true });
  await expect
    .poll(
      async () => {
        await customer.goto(`/en/p/${slug}`);
        return line.count();
      },
      { timeout: 90_000, intervals: [5_000] }
    )
    .toBeGreaterThan(0);
  if (!(await line.first().isVisible())) await customer.getByText(/other offer/).click();
  await line.first().locator("xpath=ancestor::*[.//button[normalize-space()='Add to cart']][1]").getByRole("button", { name: "Add to cart" }).click();
  await expect(customer.getByText("Added to the cart.")).toBeVisible();
}

test("a company order over its limit waits for a colleague", async ({ browser, request }) => {
  test.setTimeout(300_000);
  const stamp = Date.now();
  const ownerEmail = `demo.company.${stamp}+clerk_test@example.com`;
  const approverEmail = `demo.approver.${stamp}+clerk_test@example.com`;
  const company = `Chantier ${stamp.toString(36)}`;
  try {
    // A customer applies for a company account.
    const owner = await (await browser.newContext()).newPage();
    await signInAs(owner, ownerEmail);
    await owner.goto("/en/business");
    await owner.getByLabel("Company name").fill(company);
    await owner.getByLabel("Country").last().selectOption("BF");
    await owner.getByRole("textbox", { name: /^City/ }).fill("Ouagadougou");
    await owner.getByRole("textbox", { name: /^Address/ }).fill("Zone industrielle de Kossodo");
    await owner.getByRole("textbox", { name: /^Phone/ }).fill("+226 70 00 00 03");
    await button(owner, "Send the application").click();
    await expect(owner.getByText("Waiting for review").first()).toBeVisible();

    // Staff approve it with a spend limit any order goes over.
    const staff = await person(browser, "super_admin");
    await staff.goto("/en/b2b?queue=toReview");
    await staff.getByRole("link", { name: company }).click();
    await staff.getByLabel("Spend limit (store currency)").fill("1000");
    await button(staff, "Approve").click();
    await expect(staff.getByText("Approved").first()).toBeVisible();
    await done(staff);

    // The owner invites a colleague to approve, who joins by opening their account.
    await owner.goto("/en/account/company/staff");
    await owner.getByLabel("Email").fill(approverEmail);
    await owner.getByLabel("Role").selectOption({ label: "Approver" });
    await button(owner, "Invite").click();
    await expect(owner.getByText(approverEmail)).toBeVisible();
    const approver = await (await browser.newContext()).newPage();
    await signInAs(approver, approverEmail);
    await approver.goto("/en/account");
    await expect(approver.getByRole("heading", { level: 1 })).toBeVisible();

    // The owner orders: over the limit, it waits.
    const { slug, offer } = await findProduct(request, (v) => offersOf(v).find((o) => !o.seller && o.availability.kind === "IN_STOCK" && o.availability.city === "Ouagadougou"));
    await addFromProductPage(owner, slug, offer.seller ? `Sold by ${offer.seller.name}` : "Sold by Tracecart");
    await owner.goto("/en/checkout");
    await toPickupPoint(owner);
    await owner.getByRole("radio", { name: /Cash on delivery/ }).check();
    await button(owner, /^Place the order · /).click();
    await owner.waitForURL(/\/checkout\/done\//);
    const reference = owner.url().split("/").pop()!;
    await owner.goto(`/en/account/orders/${reference}`);
    await expect(owner.getByText("Your order is waiting for a colleague")).toBeVisible();

    // The colleague approves it; the order goes ahead.
    await approver.goto("/en/account/company/orders");
    await expect(approver.getByText(reference)).toBeVisible();
    await approver.getByRole("listitem").filter({ hasText: reference }).getByRole("button", { name: "Approve" }).click();
    await expect(approver.getByText("Nothing is waiting.")).toBeVisible();
    await done(approver);
    await owner.reload();
    await expect(owner.getByRole("heading", { level: 1, name: "Confirmed" })).toBeVisible();
    await done(owner);
  } finally {
    await deleteClerkUser(ownerEmail);
    await deleteClerkUser(approverEmail);
  }
});

test("a deal, a coupon and a gift card at checkout", async ({ browser, request }) => {
  test.setTimeout(300_000);
  const stamp = Date.now();
  const email = `demo.shopper.${stamp}+clerk_test@example.com`;
  const code = `E2E${stamp.toString(36).toUpperCase()}`.slice(0, 20);
  try {
    // Marketing puts a Tracecart offer on a deal from now, and makes a coupon and a gift card.
    const { slug, sku } = await findProduct(request, (v) => {
      const own = offersOf(v).filter((o) => !o.seller);
      return own.length === 1 && own[0].availability.kind === "IN_STOCK" && own[0].availability.city === "Ouagadougou" ? own[0] : undefined;
    });
    const marketing = await person(browser, "marketing");
    await marketing.goto("/en/store-deals");
    await marketing.getByLabel("SKU").fill(sku);
    await marketing.getByLabel(/^Deal price/).fill("1000");
    await marketing.getByLabel("Ends").fill(new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 16));
    await button(marketing, "Schedule").click();
    await expect(marketing.getByText("Live").first()).toBeVisible();

    await marketing.goto("/en/coupons");
    await marketing.getByLabel("Code").fill(code);
    await marketing.getByLabel("Basis points").fill("1000");
    await button(marketing, "Create").click();
    await expect(marketing.getByText(code)).toBeVisible();

    await marketing.goto("/en/gift-cards");
    await marketing.getByLabel(/^Amount/).fill("5000000");
    await button(marketing, "Issue the card").click();
    const giftCode = (await marketing.locator("p.select-all").textContent())!.trim();
    expect(giftCode).toMatch(/^[A-Z2-9]{4}(-[A-Z2-9]{4}){3}$/);
    await done(marketing);

    // The store shows the deal.
    const shopper = await (await browser.newContext()).newPage();
    await signInAs(shopper, email);
    await expect
      .poll(
        async () => {
          await shopper.goto("/en/deals");
          return shopper.locator(`a[href$="/p/${slug}"]`).count();
        },
        { timeout: 90_000, intervals: [5_000] }
      )
      .toBeGreaterThan(0);
    await expect(shopper.getByText(/^Deal · ends/).first()).toBeVisible();

    // At checkout: the coupon takes 10 % off the items, the gift card pays the rest.
    await addFromProductPage(shopper, slug, "Sold by Tracecart");
    await shopper.goto("/en/checkout");
    await toPickupPoint(shopper);
    await shopper.getByLabel("Coupon code").fill(code);
    await button(shopper, "Apply").click();
    await expect(shopper.getByText("Discount")).toBeVisible();
    await shopper.getByLabel("Gift card").fill(giftCode);
    await button(shopper, "Use").click();
    await expect(shopper.getByText("Your gift card pays the whole order.")).toBeVisible();
    await expect(shopper.getByText("To pay now")).toBeVisible();
    await button(shopper, /^Place the order · 0 XOF$/).click();
    await shopper.waitForURL(/\/checkout\/done\//);
    const reference = shopper.url().split("/").pop()!;
    await shopper.goto(`/en/account/orders/${reference}`);
    await expect(shopper.getByRole("heading", { level: 1, name: "Confirmed" })).toBeVisible();
    await expect(shopper.getByText("Gift card", { exact: true })).toBeVisible();
    await done(shopper);
  } finally {
    await deleteClerkUser(email);
  }
});

test("a review with a photo, published by a moderator and answered by the seller", async ({ browser, request }) => {
  test.setTimeout(420_000);
  const stamp = Date.now();
  const email = `demo.reviewer.${stamp}+clerk_test@example.com`;
  const shop = "Quincaillerie du Centre";
  try {
    // A customer buys from a seller and collects it at a pickup point, paying cash.
    const { slug } = await findProduct(request, (v) => offersOf(v).find((o) => o.seller?.name === shop && o.availability.kind !== "OUT_OF_STOCK"));
    const customer = await (await browser.newContext()).newPage();
    await signInAs(customer, email);
    await addFromProductPage(customer, slug, `Sold by ${shop}`);
    await customer.goto("/en/checkout");
    await toPickupPoint(customer);
    await customer.getByRole("radio", { name: /Cash on delivery/ }).check();
    const place = button(customer, /^Place the order · /);
    const total = (await place.textContent())!.replace(/.*· /, "").replace(/\D/g, "");
    await place.click();
    await customer.waitForURL(/\/checkout\/done\//);
    const reference = customer.url().split("/").pop()!;
    await deliverAtPickupPoint(browser, customer, reference, total);

    // A review with a photo; it waits.
    const body = `Solid, well finished, and it arrived on time (${stamp}).`;
    await customer.goto(`/en/p/${slug}`);
    await customer.getByLabel("Your review").fill(body);
    await button(customer, "Send for review").click();
    await expect(customer.getByText("Your review is waiting to be published.")).toBeVisible();
    await customer.getByLabel("Add a photo (JPEG, PNG or WebP)").setInputFiles({ name: "tool.jpg", mimeType: "image/jpeg", buffer: JPEG });
    await expect(customer.getByRole("img", { name: "Your photo 1" })).toBeVisible();

    // A moderator publishes it from their dashboard.
    const moderator = await person(browser, "content_moderator");
    await moderator.goto("/en/dashboard");
    await moderator.getByRole("link", { name: /Reviews to publish/ }).click();
    const card = moderator.getByRole("listitem").filter({ hasText: body });
    await expect(card.getByRole("img", { name: "Photo 1" })).toBeVisible();
    await card.getByRole("button", { name: "Publish" }).click();
    await expect(card).toHaveCount(0);

    // The seller answers in the Seller Center; the answer waits too.
    const seller = await person(browser, "seller_owner");
    await seller.goto("/en/seller/reviews");
    const mine = seller.getByRole("listitem").filter({ hasText: body });
    await mine.getByLabel("Your answer").fill("Thank you for the kind words. Enjoy the tool.");
    await mine.getByRole("button", { name: "Send for review" }).click();
    await expect(mine.getByText("Waiting")).toBeVisible();
    await done(seller);

    await moderator.reload();
    const answer = moderator.getByRole("listitem").filter({ hasText: body });
    await answer.getByRole("button", { name: "Publish the answer" }).click();
    await expect(answer).toHaveCount(0);
    await done(moderator);

    // On the product page: the review, its photo and the seller's answer.
    await customer.goto(`/en/p/${slug}`);
    const published = customer.getByRole("listitem").filter({ hasText: body });
    await expect(published.getByRole("img", { name: /^Photo 1 from/ })).toBeVisible();
    await expect(published.getByText(`Answer from ${shop}`)).toBeVisible();
    await expect(published.getByText("Thank you for the kind words. Enjoy the tool.")).toBeVisible();
    await done(customer);
  } finally {
    await deleteClerkUser(email);
  }
});
