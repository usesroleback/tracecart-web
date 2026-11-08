"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { setCompared } from "@/lib/shelf";

/** Takes one product out of the comparison and shows the rest. */
export function RemoveFromCompare({ slug, remaining, label }: { slug: string; remaining: string[]; label: string }) {
  const t = useTranslations("store.compare");
  const router = useRouter();
  return (
    <button
      type="button"
      data-slug={slug}
      aria-label={label}
      onClick={() => {
        setCompared(remaining);
        router.replace("/compare");
        router.refresh();
      }}
      className="self-start text-xs text-ink-muted underline hover:text-ink"
    >
      {t("removeShort")}
    </button>
  );
}
