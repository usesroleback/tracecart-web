"use client";

import { SignOutButton } from "@clerk/nextjs";
import { useLocale, useTranslations } from "next-intl";
import Button from "@/components/ui/button/Button";

/** Signed in with Clerk, but not let into the console. */
export function AccessProblem({ kind }: { kind: "noAccount" | "unavailable" }) {
  const t = useTranslations("auth");
  const locale = useLocale();

  return (
    <div className="rounded-[var(--radius-m)] border border-line bg-surface-raised p-6">
      <h1 className="sq-title text-ink">{t(`${kind}.title`)}</h1>
      <p className="mt-2 text-sm text-ink-muted">{t(`${kind}.body`)}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        {kind === "unavailable" && (
          <Button variant="primary" size="m" onClick={() => window.location.reload()}>
            {t("retry")}
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
