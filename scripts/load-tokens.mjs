// Session tokens for the API's checkout load test (tracecart-api load/README.md).
// Each customer signs in through Clerk itself in a headless browser, as the
// browser tests do (ADR-047), so the token carries the web app's origin as its
// authorized party, which the API requires. Tokens last about a minute: they're
// all asked for at the end, then written out. A Clerk development instance only.
//
//   CLERK_SECRET_KEY=sk_test_... WEB_URL=http://localhost:3002 node scripts/load-tokens.mjs 20 ../tracecart-api/load/.tokens.json

import { writeFileSync } from "node:fs";
import { chromium } from "@playwright/test";

const SECRET = process.env.CLERK_SECRET_KEY ?? "";
if (!SECRET.startsWith("sk_test_")) {
  console.error("Refusing: CLERK_SECRET_KEY must be a development instance's key (sk_test_...).");
  process.exit(1);
}
const WEB = process.env.WEB_URL ?? "http://localhost:3000";
const count = Number(process.argv[2] ?? 20);
const out = process.argv[3] ?? "tokens.json";

async function clerk(method, path, body) {
  const res = await fetch(`https://api.clerk.com/v1${path}`, {
    method,
    headers: { Authorization: `Bearer ${SECRET}`, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Clerk ${method} ${path.split("?")[0]}: ${res.status}`);
  return res.json();
}

async function userId(email) {
  const found = await clerk("GET", `/users?email_address=${encodeURIComponent(email)}`);
  return found[0]?.id ?? (await clerk("POST", "/users", { email_address: [email], skip_password_requirement: true, skip_legal_checks: true })).id;
}

const browser = await chromium.launch();
const pages = [];
try {
  for (let i = 1; i <= count; i++) {
    const email = `demo.load.${i}+clerk_test@example.com`;
    const { token: ticket } = await clerk("POST", "/sign_in_tokens", { user_id: await userId(email), expires_in_seconds: 300 });
    const page = await (await browser.newContext()).newPage();
    await page.goto(`${WEB}/en/login`);
    await page.waitForFunction(() => window.Clerk?.loaded === true);
    const status = await page.evaluate(async (t) => {
      const attempt = await window.Clerk.client.signIn.create({ strategy: "ticket", ticket: t });
      if (attempt.status === "complete") await window.Clerk.setActive({ session: attempt.createdSessionId });
      return attempt.status;
    }, ticket);
    if (status !== "complete") throw new Error(`${email} didn't sign in (${status})`);
    // The API makes the customer account on first sight, as the store does.
    await page.evaluate(() => fetch("/api/tracecart/customer/account", { method: "POST" }));
    pages.push({ email, page });
  }
  const tokens = [];
  for (const { email, page } of pages) tokens.push({ email, token: await page.evaluate(() => window.Clerk.session.getToken({ skipCache: true })) });
  writeFileSync(out, JSON.stringify(tokens, null, 2));
  console.log(`Wrote ${tokens.length} tokens to ${out} (valid about a minute).`);
} finally {
  await browser.close();
}
