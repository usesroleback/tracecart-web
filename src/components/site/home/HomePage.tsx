import { useTranslations } from "next-intl";
import "./home.css";
import { HomeNav } from "./HomeNav";
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
import { ClosingAndFooter } from "./ClosingAndFooter";

/**
 * The redesigned homepage, one component per section. Served at
 * /preview/home until its placeholders (PLACEHOLDERS.md) are replaced;
 * making it the homepage means rendering it from (site)/page.tsx.
 */
export function HomePage() {
  const t = useTranslations("home");

  return (
    <div className="hp min-h-screen pb-[1px]">
      <HomeNav />
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
      <ClosingAndFooter />
    </div>
  );
}
