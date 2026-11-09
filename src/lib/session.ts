import { cache } from "react";
import { auth } from "@clerk/nextjs/server";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { SERVER_API_URL } from "./apiBase";
import { Role, SessionUser } from "./types";

export const ROLE_HOME: Record<Role, string> = {
  SUPER_ADMIN: "/dashboard",
  // Their dashboard: a pickup point has no deliveries page, so it can't be everyone's home.
  LOGISTICS_PARTNER: "/dashboard",
  CUSTOMER: "/account",
  // Staff who are not hub admins; their areas of the console arrive as they are rebuilt.
  STAFF: "/dashboard",
};

/** Clerk session token for calling the API as the signed-in user; null when signed out. */
export async function getServerToken(): Promise<string | null> {
  const { getToken } = await auth();
  return getToken();
}

export type SessionState =
  | { status: "signed-out" }
  | { status: "ok"; user: SessionUser }
  // Signed in with Clerk, but the API has no Tracecart account for them.
  | { status: "no-account" }
  // A staff account, in a session without a second factor (ADR-020).
  | { status: "mfa-required" }
  // Signed in, but the API couldn't confirm who they are (down, misconfigured).
  | { status: "unavailable" };

/** The signed-in Tracecart user. Cached per request, so layouts and pages can share it. */
export const getSessionState = cache(async (): Promise<SessionState> => {
  const token = await getServerToken();
  if (!token) return { status: "signed-out" };

  try {
    const res = await fetch(`${SERVER_API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (res.ok) return { status: "ok", user: (await res.json()) as SessionUser };
    if (res.status === 403) {
      const body = (await res.json().catch(() => null)) as { error?: { code?: string } } | null;
      return { status: body?.error?.code === "MFA_REQUIRED" ? "mfa-required" : "no-account" };
    }
    return { status: "unavailable" };
  } catch {
    return { status: "unavailable" };
  }
});

/**
 * Keeps each console section to the role it's built for, sending everyone
 * else to their own home. UX only — the API enforces roles on every request.
 */
export async function requireRole(role: Role): Promise<SessionUser> {
  const state = await getSessionState();
  const locale = await getLocale();
  if (state.status !== "ok") return redirect({ href: "/login", locale });
  if (state.user.role !== role) return redirect({ href: ROLE_HOME[state.user.role], locale });
  return state.user;
}

/**
 * A section whose legacy service behind it only admits some account types, on
 * top of the permission (ADR-048). UX only, like requireRole.
 */
export async function requireAccess(permission: string, accountTypes?: Role[], hubPermission?: string): Promise<SessionUser> {
  const user = await requirePermission(permission);
  if (!accountTypes) return user;
  if (accountTypes.includes(user.role) || (hubPermission && can(user, hubPermission))) return user;
  return redirect({ href: ROLE_HOME[user.role], locale: await getLocale() });
}

export const can = (user: SessionUser, permission: string) => user.permissions?.includes(permission) ?? false;

/**
 * Keeps a console section to holders of a permission (catalogue screens and
 * the like), sending everyone else to their own home. UX only, like requireRole.
 */
export async function requirePermission(permission: string | string[]): Promise<SessionUser> {
  const state = await getSessionState();
  const locale = await getLocale();
  if (state.status !== "ok") return redirect({ href: "/login", locale });
  if (![permission].flat().some((p) => can(state.user, p))) return redirect({ href: ROLE_HOME[state.user.role], locale });
  return state.user;
}

/** A console page that belongs to a named role (Seller Center), not just a permission staff also hold. */
export async function requireRoleKey(key: string | string[]): Promise<SessionUser> {
  const state = await getSessionState();
  const locale = await getLocale();
  if (state.status !== "ok") return redirect({ href: "/login", locale });
  if (![key].flat().some((k) => state.user.roles?.includes(k))) return redirect({ href: ROLE_HOME[state.user.role], locale });
  return state.user;
}
