"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

/**
 * FR / EN: switches to the other language on the same page, keeping the
 * query (the selected tab). The query is read on click, not with
 * useSearchParams, so static pages need no Suspense boundary for it.
 */
export function LocaleSwitcher({ size = "m" }: { size?: "s" | "m" }) {
  const locale = useLocale();
  const t = useTranslations("common.locale");
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const next = routing.locales.find((l) => l !== locale) ?? routing.defaultLocale;

  function switchLocale() {
    const href = `${pathname}${window.location.search}`;
    startTransition(() => router.replace(href, { locale: next, scroll: false }));
  }

  return (
    <button
      type="button"
      onClick={switchLocale}
      disabled={pending}
      aria-label={t("switch")}
      title={t("switch")}
      className={`flex ${size === "s" ? "h-9 min-w-9" : "h-11 min-w-11"} items-center justify-center rounded-full border border-line bg-surface-raised px-3 font-mono text-[13px] font-medium uppercase text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink disabled:opacity-60`}
    >
      {next}
    </button>
  );
}
