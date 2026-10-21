import { getLocale } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';

import AdminShell from "@/layout/AdminShell";
import { SessionProvider } from "@/context/SessionContext";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { getServerToken, getSessionState } from "@/lib/session";
import { SERVER_API_URL } from "@/lib/apiBase";
import { Locale } from "@/lib/types";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const state = await getSessionState();
  // The login page explains why (no account, API unreachable) when needed.
  const locale = (await getLocale()) as Locale;
  if (state.status !== "ok") return redirect({ href: '/login', locale });
  // The console is for staff; a customer account has its own area.
  if (state.user.role === "CUSTOMER") return redirect({ href: "/account", locale });

  // Notifications follow the language the console is used in: record it when
  // it changes (once, not on every page).
  if (state.user.locale !== locale) await rememberLocale(locale);

  return (
    <AuthProvider>
      <SessionProvider user={state.user}>
        <AdminShell>{children}</AdminShell>
      </SessionProvider>
    </AuthProvider>
  );
}

async function rememberLocale(locale: Locale) {
  const token = await getServerToken();
  if (!token) return;
  // Best effort: a failure only means notifications stay in the old language.
  await fetch(`${SERVER_API_URL}/me/locale`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ locale }),
    cache: "no-store",
  }).catch(() => undefined);
}
