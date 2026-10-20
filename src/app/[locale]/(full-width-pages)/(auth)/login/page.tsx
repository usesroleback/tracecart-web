import { Metadata } from "next";
import { SignIn } from "@clerk/nextjs";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { Logo } from "@/components/common/Logo";
import { AccessProblem } from "@/components/auth/AccessProblem";
import { getSessionState } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("meta.title"), description: t("meta.description") };
}

export default async function SignInPage() {
  const locale = await getLocale();
  const t = await getTranslations("auth");
  const state = await getSessionState();

  if (state.status === "ok") return redirect({ href: "/dashboard", locale });

  return (
    <div className="flex flex-col flex-1 lg:w-1/2 w-full">
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div className="mb-5 sm:mb-8">
          <Logo href={null} className="mb-4" />
          {state.status === "signed-out" && <p className="text-sm text-ink-muted">{t("subtitle")}</p>}
        </div>
        {state.status === "signed-out" ? (
          <SignIn
            routing="hash"
            forceRedirectUrl={`/${locale}/dashboard`}
            // Accounts are created by TraceCart admins, not by signing up.
            appearance={{ elements: { footerAction: "hidden" } }}
          />
        ) : (
          <AccessProblem kind={state.status === "no-account" ? "noAccount" : "unavailable"} />
        )}
      </div>
    </div>
  );
}
