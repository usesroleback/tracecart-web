import { getLocale } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';

import AdminShell from "@/layout/AdminShell";
import { SessionProvider } from "@/context/SessionContext";
import { serverGet } from "@/lib/serverApi";
import { SessionUser } from "@/lib/types";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await serverGet<SessionUser>("/auth/me");
  if (!user) return redirect({ href: '/login', locale: await getLocale() });

  return (
    <SessionProvider user={user}>
      <AdminShell>{children}</AdminShell>
    </SessionProvider>
  );
}
