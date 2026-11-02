"use client";

import { ReactNode, useEffect, useState } from "react";
import { useAuth, useClerk } from "@clerk/nextjs";
import { useLocale, useTranslations } from "next-intl";
import { CustomerProfile, ensureCustomerAccount, StaffAccountError } from "@/lib/customer";

export const box = "rounded-[var(--radius-m)] border border-line bg-surface-raised p-5 sm:p-6";

/**
 * A customer page's door: sign in or create an account (Clerk, over the
 * page), then the customer account (made on first visit) is handed to the
 * page. Staff accounts are turned away: they don't buy or ship as customers.
 */
export function SignInGate({ title, lead, children }: { title: string; lead: string; children: (profile: CustomerProfile, refresh: (p: CustomerProfile) => void) => ReactNode }) {
  const t = useTranslations("services.gate");
  const locale = useLocale();
  const clerk = useClerk();
  const { isLoaded, isSignedIn } = useAuth();
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "staff" | "failed">("loading");

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    ensureCustomerAccount()
      .then((p) => {
        setProfile(p);
        setState("ready");
      })
      .catch((err) => setState(err instanceof StaffAccountError ? "staff" : "failed"));
  }, [isLoaded, isSignedIn]);

  const here = typeof window === "undefined" ? `/${locale}` : window.location.href;
  if (!isLoaded) return <p className="text-ink-muted">{t("loading")}</p>;
  if (!isSignedIn) {
    return (
      <div className={`${box} mx-auto max-w-lg text-center`}>
        <h2 className="rb-headline text-[24px]">{title}</h2>
        <p className="mt-2 text-sm text-ink-muted">{lead}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button type="button" className="rounded-[var(--radius-s)] bg-ink px-5 py-3 font-medium text-ink-inverse" onClick={() => clerk.openSignIn({ forceRedirectUrl: here, signUpForceRedirectUrl: here })}>
            {t("signIn")}
          </button>
          <button type="button" className="rounded-[var(--radius-s)] border border-ink px-5 py-3 font-medium text-ink" onClick={() => clerk.openSignUp({ forceRedirectUrl: here, signInForceRedirectUrl: here })}>
            {t("signUp")}
          </button>
        </div>
      </div>
    );
  }
  if (state === "loading") return <p className="text-ink-muted">{t("loading")}</p>;
  if (state === "staff") return <p className={box}>{t("staff")}</p>;
  if (state === "failed" || !profile) return <p className="text-critical">{t("failed")}</p>;
  return <>{children(profile, setProfile)}</>;
}
