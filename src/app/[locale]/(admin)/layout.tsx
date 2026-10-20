import { getLocale } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';

import AdminShell from "@/layout/AdminShell";
import { SessionProvider } from "@/context/SessionContext";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { getSessionState } from "@/lib/session";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const state = await getSessionState();
  // The login page explains why (no account, API unreachable) when needed.
  if (state.status !== "ok") return redirect({ href: '/login', locale: await getLocale() });

  return (
    <AuthProvider>
      <SessionProvider user={state.user}>
        <AdminShell>{children}</AdminShell>
      </SessionProvider>
    </AuthProvider>
  );
}
