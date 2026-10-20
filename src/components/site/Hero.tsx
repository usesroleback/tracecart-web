import { useTranslations } from "next-intl";
import { RouteDrawing } from "./RouteDrawing";

export function Hero() {
  const t = useTranslations("site.hero");

  return (
    <section className="mx-auto grid max-w-7xl gap-10 px-5 pb-16 pt-14 sm:px-8 sm:pt-20 lg:grid-cols-2 lg:items-center lg:pb-24 lg:pt-28">
      <div>
        <p className="rb-overline">{t("overline")}</p>
        <h1 className="rb-display-xl mt-3">{t("title")}</h1>
        <p className="mt-5 max-w-md text-base text-ink-muted sm:text-lg">
          {t("body")}
        </p>
      </div>
      <RouteDrawing
        originLabel={t("originLabel")}
        destinationLabel={t("destinationLabel")}
        className="w-full max-w-lg justify-self-end"
      />
    </section>
  );
}
