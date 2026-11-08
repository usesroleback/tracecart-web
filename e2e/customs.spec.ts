import { expect, test } from "@playwright/test";
import { button, done, person } from "./order";
import { canSignIn } from "./signIn";

// Customs (ADR-082, PLAN G6's exit): the Burkina Faso → Mali corridor described
// with its sources, a rule verified by a second person, and a change that
// makes a new version needing verification again.

test.skip(!canSignIn, "Needs a Clerk development instance's keys (CLERK_SECRET_KEY, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)");

test("a customs officer reads the corridor; a rule is verified by someone else, then changed by a new version", async ({ browser }) => {
  test.setTimeout(240_000);
  const officer = await person(browser, "customs_officer");
  await officer.goto("/en/customs");
  const corridor = officer.getByRole("region", { name: "Corridor" });
  await expect(corridor.getByText(/^4 rules, \d+ verified\./)).toBeVisible();
  await expect(corridor.getByText("Goods originating in UEMOA: no customs duty")).toBeVisible();
  await expect(corridor.getByText("Import VAT in Mali: 18 %")).toBeVisible();
  await expect(corridor.getByText(/Code général des impôts du Mali/)).toBeVisible();

  // Goods from outside the Union meet the common tariff and the levies.
  await corridor.getByLabel("Goods originating in").selectOption("CN");
  await button(officer, "Show").click();
  await expect(corridor.getByText("Statistical fee (RS): 1 %")).toBeVisible();
  await expect(corridor.getByText(/Règlement n°02\/97\/CM\/UEMOA/).first()).toBeVisible();

  // Verify the solidarity levy against its source.
  await corridor.getByText("Community solidarity levy (PCS): 1 %").locator("xpath=ancestor::li").getByRole("link", { name: "Open the rule" }).click();
  // Whatever version it's at (the tests may have run on this database before).
  const heading = officer.getByRole("heading", { name: /^Rule, version \d+$/ });
  await expect(heading).toBeVisible();
  let version = Number((await heading.textContent())!.replace(/\D/g, ""));
  const ruleUrl = officer.url();

  // Someone other than whoever entered it verifies it against its source.
  const admin = await person(browser, "admin");
  await admin.goto(ruleUrl);
  if (await button(admin, "Verify this version").isVisible()) {
    await admin.getByLabel("What you checked").fill("Read in the Acte additionnel n°04/96");
    await button(admin, "Verify this version").click();
  }
  await expect(admin.getByText(/^Verified by /)).toBeVisible();
  await done(admin);
  await officer.reload();

  // A change is a new version, to verify again; the earlier ones stay on record.
  await button(officer, "Change (new version)").click();
  await officer.getByLabel("Article, page or section").fill(`Article ${version + 2}`);
  await button(officer, "Save as a new version").click();
  version += 1;
  await expect(officer.getByRole("heading", { name: `Rule, version ${version}` })).toBeVisible();
  const versions = officer.getByRole("region", { name: "Versions" });
  await expect(versions.getByRole("listitem")).toHaveCount(version);
  await expect(button(officer, "Verify this version")).toBeVisible();

  // Customs cases are theirs to work.
  await officer.goto("/en/customs/reviews");
  await expect(officer.getByRole("heading", { name: "Customs cases" })).toBeVisible();
  await done(officer);
});
