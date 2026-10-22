import { useTranslations } from "next-intl";
import { SiteShell } from "./SiteShell";
import { HomeHero } from "./HomeHero";
import { FinderSection, TrustBar } from "./TrustBar";
import { PointOfView } from "./PointOfView";
import { Services } from "./Services";
import { CorridorMarquee } from "./CorridorMarquee";
import { Results } from "./Results";
import { SelectedWork } from "./SelectedWork";
import { Stats } from "./Stats";
import { Process } from "./Process";
import { Comparison } from "./Comparison";
import { Testimonials } from "./Testimonials";
import { Insights } from "./Insights";

/**
 * The homepage, one component per section. Its images, figures and stories
 * are still placeholders: see PLACEHOLDERS.md.
 */
export function HomePage() {
  const t = useTranslations("home");

  return (
    <SiteShell closing>
      <main>
        <HomeHero />
        <FinderSection />
        <TrustBar />
        <div className="hp-panel hp-grid-lines relative z-10">
          <PointOfView />
          <Services />
        </div>
        <CorridorMarquee />
        <Results />
        <SelectedWork />
        <Stats />
        <Process />
        <Comparison cta={t("nav.cta")} />
        <Testimonials />
        <Insights />
      </main>
    </SiteShell>
  );
}
