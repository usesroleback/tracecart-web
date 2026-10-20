import { defineConfig, devices } from "@playwright/test";

// Browser tests against a running web app + API with seeded test data.
// Start everything with e2e/run.sh (what CI does); see README "Tests".
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: process.env.E2E_WEB_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  // Phone-sized: the quote page is opened from an SMS or email link.
  projects: [{ name: "mobile-chromium", use: { ...devices["Pixel 7"] } }],
});
