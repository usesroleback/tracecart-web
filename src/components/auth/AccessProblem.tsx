"use client";

import { SignOutButton, useClerk } from "@clerk/nextjs";
import { useLocale, useTranslations } from "next-intl";
import Button from "@/components/ui/button/Button";

/** Signed in with Clerk, but not let into the console. */
export function AccessProblem({ kind }: { kind: "noAccount" | "unavailable" | "mfaRequired" }) {
  const t = useTranslations("auth");
  const locale = useLocale();
  const clerk = useClerk();

  return (
    <div className="rounded-[var(--radius-m)] border border-line bg-surface-raised p-6">
      <h1 className="rb-title text-ink">{t(`${kind}.title`)}</h1>
      <p className="mt-2 text-sm text-ink-muted">{t(`${kind}.body`)}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        {kind === "unavailable" && (
          <Button variant="primary" size="m" onClick={() => window.location.reload()}>
            {t("retry")}
          </Button>
        )}
        {kind === "mfaRequired" && (
          <Button variant="primary" size="m" onClick={() => clerk.openUserProfile()}>
            {t("mfaRequired.cta")}
          </Button>
        )}
        <SignOutButton redirectUrl={`/${locale}/login`}>
          <Button variant="secondary" size="m">
            {t("signOut")}
          </Button>
        </SignOutButton>
      </div>
    </div>
  );
}
