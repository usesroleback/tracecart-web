import { useTranslations } from "next-intl";
import { Logo } from "@/components/common/Logo";

export function SiteFooter() {
  const t = useTranslations("site.footer");

  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div className="flex items-center gap-2">
          <Logo href={null} />
          <div>
            <p className="font-bricolage text-sm font-[650] text-ink">{t("brand")}</p>
            <p className="text-xs text-ink-muted">{t("byline")}</p>
          </div>
        </div>
        <p className="sq-mono-s text-ink-muted">{t("cities")}</p>
      </div>
    </footer>
  );
}
