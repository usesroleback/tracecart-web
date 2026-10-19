import { SiteHeader } from "@/components/site/SiteHeader";
import { Hero } from "@/components/site/Hero";
import { QuoteBar } from "@/components/site/QuoteBar";
import { HowItWorks } from "@/components/site/HowItWorks";
import { Proof } from "@/components/site/Proof";
import { Corridors } from "@/components/site/Corridors";
import { ClosingBand } from "@/components/site/ClosingBand";
import { SiteFooter } from "@/components/site/SiteFooter";

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main>
        <Hero />
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <QuoteBar />
        </div>
        <HowItWorks />
        <Proof />
        <Corridors />
        <ClosingBand />
      </main>
      <SiteFooter />
    </>
  );
}
