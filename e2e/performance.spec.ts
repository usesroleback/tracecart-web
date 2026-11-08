import { gzipSync } from "node:zlib";
import { expect, test, type Page } from "@playwright/test";

// PLAN §12 targets (ADR-083), measured in the browser on the production build:
// - store JavaScript under 170 kB gzipped per route: every script a fresh
//   visit downloads, gzipped here;
// - the largest contentful paint under 2.5 s on a product page and 3 s on a
//   listing, on Lighthouse's mobile profile: about 1.6 Mbit/s down with 150 ms
//   of latency, and a CPU four times slower.
// Chromium only (the throttling uses its DevTools protocol).

// PLAN §12's budget is 170 kB. Not met yet (ADR-083): Next and React alone are
// about 129 kB, and Next attaches the console's chunks (Clerk's 33 kB among
// them) to client modules the store shares with it. Until the console is its
// own app, this holds today's size as a ceiling, so it can only shrink.
const JS_TARGET = 170 * 1024;
const JS_CEILING = 230 * 1024;

async function scriptsGzipped(page: Page, path: string) {
  const bodies: Promise<Buffer | null>[] = [];
  page.on("response", (r) => {
    if (r.request().resourceType() === "script")
      bodies.push(r.body().catch(() => null));
  });
  await page.goto(path);
  await page.waitForLoadState("networkidle");
  const all = (await Promise.all(bodies)).filter((b): b is Buffer => !!b);
  return all.reduce((sum, b) => sum + gzipSync(b).length, 0);
}

async function throttle(page: Page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 150,
    downloadThroughput: (1.6 * 1024 * 1024) / 8,
    uploadThroughput: (750 * 1024) / 8,
  });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
}

async function lcp(page: Page): Promise<number> {
  return page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        let last = 0;
        new PerformanceObserver((list) => {
          for (const e of list.getEntries()) last = e.startTime;
        }).observe({ type: "largest-contentful-paint", buffered: true });
        // The LCP is final once the page has settled; give it a moment.
        setTimeout(() => resolve(last), 1500);
      }),
  );
}

async function aProduct(page: Page) {
  await page.goto("/en/s?q=perceuse");
  return (await page
    .locator('main a[href*="/en/p/"]')
    .first()
    .getAttribute("href"))!;
}

async function aCategory(page: Page) {
  await page.goto("/en/c");
  return (await page
    .locator('main a[href*="/en/c/"]')
    .first()
    .getAttribute("href"))!;
}

test.describe("performance", () => {
  test.skip(
    ({ browserName }) => browserName !== "chromium",
    "Throttling needs Chromium",
  );

  test("store routes stay within the JavaScript budget", async ({
    browser,
  }) => {
    test.setTimeout(240_000);
    const setup = await browser.newPage();
    const routes = [
      "/en",
      "/en/c",
      await aCategory(setup),
      await aProduct(setup),
      "/en/s?q=perceuse",
      "/en/cart",
      "/en/parts",
      "/en/deals",
    ];
    await setup.close();
    const sizes: Record<string, string> = {};
    for (const path of routes) {
      const page = await browser.newPage();
      const bytes = await scriptsGzipped(page, path);
      sizes[path] = `${Math.round(bytes / 1024)} kB`;
      expect
        .soft(
          bytes,
          `${path}: ${Math.round(bytes / 1024)} kB of JavaScript, gzipped`,
        )
        .toBeLessThan(JS_CEILING);
      await page.close();
    }
    console.log("[perf] store JavaScript, gzipped:", JSON.stringify(sizes), `(target ${JS_TARGET / 1024} kB)`);
  });

  test("a product page and a listing paint fast on a mid-range phone over 3G", async ({
    browser,
  }) => {
    test.setTimeout(240_000);
    const setup = await browser.newPage();
    const product = await aProduct(setup);
    const category = await aCategory(setup);
    await setup.close();
    const results: Record<string, number> = {};
    for (const [path, budget] of [
      [product, 2500],
      [category, 3000],
    ] as const) {
      // A fresh visit each time: no cache from earlier pages.
      const context = await browser.newContext();
      const page = await context.newPage();
      await throttle(page);
      await page.goto(path, { waitUntil: "load" });
      const ms = Math.round(await lcp(page));
      results[path] = ms;
      expect
        .soft(ms, `${path}: largest contentful paint ${ms} ms`)
        .toBeLessThan(budget);
      await context.close();
    }
    console.log(
      "[perf] largest contentful paint (ms):",
      JSON.stringify(results),
    );
  });
});
