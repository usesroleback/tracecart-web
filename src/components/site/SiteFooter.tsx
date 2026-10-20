import { useTranslations } from "next-intl";
import { Logo } from "@/components/common/Logo";

export function SiteFooter() {
  const t = useTranslations("site.footer");

  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        {/* Lockup + a translated byline rather than the endorsed file, whose
            "a roleback company" is drawn in English. */}
        <div>
          <Logo variant="lockup" height={20} href={null} />
          <p className="mt-1.5 text-xs text-ink-muted">{t("byline")}</p>
        </div>
        <p className="rb-mono-s text-ink-muted">{t("cities")}</p>
      </div>
    </footer>
  );
}
