import { useTranslations } from "next-intl";
import { SiteShell } from "./SiteShell";
import { HomeHero } from "./HomeHero";
import { PointOfView } from "./PointOfView";
import { Services } from "./Services";
import { Process } from "./Process";
import { Comparison } from "./Comparison";

/**
 * The homepage, one component per section. It shows only what TraceCart
 * does today: no figures, customers or stories until there are real ones
 * (see PLACEHOLDERS.md).
 */
export function HomePage() {
  const t = useTranslations("home");

  return (
    <SiteShell closing>
      <main>
        <HomeHero />
        <div className="hp-panel hp-grid-lines relative z-10">
          <PointOfView />
          <Services />
        </div>
        <Process />
        <Comparison cta={t("nav.cta")} />
      </main>
    </SiteShell>
  );
}
