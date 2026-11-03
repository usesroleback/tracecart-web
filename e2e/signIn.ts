import { expect, type Page } from "@playwright/test";

// Signs a browser in through Clerk itself, as one of the demo accounts
// (demo.<role>+clerk_test@example.com, from the API's seed:demo), with no shortcut in the app:
// a one-time ticket from Clerk's Backend API, redeemed by Clerk's own script on the page.
// The API then links the account by its verified email, as it does for anyone.

const API = "https://api.clerk.com/v1";
const SECRET = process.env.CLERK_SECRET_KEY ?? "";

/** Needs a real development instance's keys. With run.sh's placeholders, these tests skip. */
export const canSignIn = SECRET.startsWith("sk_test_") && SECRET !== "sk_test_e2e_placeholder";

async function clerk<T>(method: string, path: string, body?: unknown): Promise<T> {
  // Only ever a development instance: this creates users on it.
  if (!SECRET.startsWith("sk_test_")) throw new Error("Refusing to sign in with a key that isn't a development instance's");
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${SECRET}`, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Clerk ${method} ${path.split("?")[0]}: ${res.status} ${await res.text()}`);
  return (await res.json()) as T;
}

const userIds = new Map<string, string>();

async function clerkUserId(email: string): Promise<string> {
  const known = userIds.get(email);
  if (known) return known;
  const found = await clerk<{ id: string }[]>("GET", `/users?email_address=${encodeURIComponent(email)}`);
  const id =
    found[0]?.id ??
    (
      await clerk<{ id: string }>("POST", "/users", {
        email_address: [email],
        skip_password_requirement: true,
        skip_legal_checks: true,
      })
    ).id;
  userIds.set(email, id);
  return id;
}

/** Removes a person a test made for itself, so a development instance doesn't fill up. */
export async function deleteClerkUser(email: string): Promise<void> {
  const found = await clerk<{ id: string }[]>("GET", `/users?email_address=${encodeURIComponent(email)}`);
  for (const user of found) await clerk("DELETE", `/users/${user.id}`);
  userIds.delete(email);
}

/** The address of a role's demo account: "warehouse_manager" is demo.warehouse.manager+clerk_test@example.com. */
export const demoEmail = (role: string) => `demo.${role.replace(/_/g, ".")}+clerk_test@example.com`;

/** Signs this page's browser context in as the role's demo account (or any email linked to an account). */
export async function signInAs(page: Page, roleOrEmail: string): Promise<void> {
  const email = roleOrEmail.includes("@") ? roleOrEmail : demoEmail(roleOrEmail);
  const { token } = await clerk<{ token: string }>("POST", "/sign_in_tokens", { user_id: await clerkUserId(email), expires_in_seconds: 300 });

  await page.goto("/en/login");
  await page.waitForFunction(() => (window as unknown as { Clerk?: { loaded?: boolean } }).Clerk?.loaded === true);
  const status = await page.evaluate(async (ticket) => {
    const { Clerk } = window as unknown as {
      Clerk: {
        client: { signIn: { create(p: { strategy: "ticket"; ticket: string }): Promise<{ status: string; createdSessionId: string }> } };
        setActive(p: { session: string }): Promise<void>;
      };
    };
    const attempt = await Clerk.client.signIn.create({ strategy: "ticket", ticket });
    if (attempt.status === "complete") await Clerk.setActive({ session: attempt.createdSessionId });
    return attempt.status;
  }, token);
  expect(status).toBe("complete");
}
