import { expect, test } from "@playwright/test";

// AI search and the freight estimate, on the API's stand-ins for Claude and
// the embeddings (AI_FAKE, e2e/run.sh): a test photo carries what it shows as
// text in a PNG chunk, which is all the stand-in reads.

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

test("a photo of a drill finds drills, with the reasons", async ({ page }) => {
  await page.goto("/fr/s/ai");
  await page.locator('input[type="file"]').setInputFiles({ name: "perceuse.png", mimeType: "image/png", buffer: photo("Perceuse-visseuse sans fil 18 V") });
  await page.getByRole("button", { name: "Chercher", exact: true }).click();
  await expect(page.getByText("Ce que nous avons lu")).toBeVisible();
  const first = page.locator("article").first();
  await expect(first).toBeVisible();
  await expect(first.getByRole("link")).toContainText(/perceuse|visseuse/i);
  await expect(page.getByRole("link", { name: "Trouvez-le pour moi" })).toBeVisible();
});

test("the search box reads a price limit and shows it as a filter", async ({ page }) => {
  await page.goto(`/fr/s?q=${encodeURIComponent("perceuse moins de 45 000 F")}`);
  await expect(page.getByText("Lu dans votre recherche :")).toBeVisible();
  await expect(page.getByRole("link", { name: /Moins de 45/ })).toBeVisible();
});

test("anyone gets a freight estimate from photos", async ({ page }) => {
  await page.goto("/fr/freight");
  const from = page.getByRole("group", { name: "Enlevé à" });
  const to = page.getByRole("group", { name: "Livré à" });
  await from.getByRole("combobox", { name: "Pays" }).selectOption("BF");
  await from.getByRole("textbox", { name: "Ville" }).fill("Ouagadougou");
  await to.getByRole("combobox", { name: "Pays" }).selectOption("ML");
  await to.getByRole("textbox", { name: "Ville" }).fill("Bamako");
  await page.locator('input[type="file"]').setInputFiles([{ name: "a.png", mimeType: "image/png", buffer: photo("3 cartons 45 kg") }]);
  await page.getByRole("button", { name: "Obtenir une estimation" }).click();
  await expect(page.getByText("Les marchandises, telles que nous les lisons")).toBeVisible();
  await expect(page.getByText("Prix indicatif")).toBeVisible();
  await expect(page.getByText(/Entre .* et /)).toBeVisible();
  await expect(page.getByRole("button", { name: "Demander un devis ferme" })).toBeVisible();
});
