import { useTranslations } from "next-intl";
import Button from "@/components/ui/button/Button";

export function ClosingBand() {
  const t = useTranslations("site.closingBand");

  return (
    <section className="bg-ink">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-5 py-14 sm:flex-row sm:items-center sm:px-8 sm:py-16">
        <h2 className="rb-headline max-w-md text-ink-inverse">{t("title")}</h2>
        <Button href="#quote" size="l">
          {t("cta")}
        </Button>
      </div>
    </section>
  );
}
