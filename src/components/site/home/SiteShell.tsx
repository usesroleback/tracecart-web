import type { ReactNode } from "react";
import "./home.css";
import { HomeNav } from "./HomeNav";
import { ClosingAndFooter } from "./ClosingAndFooter";

/**
 * Every public site page: the sticky nav, the page, and the dark footer
 * panel. The homepage adds the closing call to action above the footer.
 */
export function SiteShell({ children, closing = false }: { children: ReactNode; closing?: boolean }) {
  return (
    <div className="hp min-h-screen pb-[1px]">
      <HomeNav />
      {children}
      <ClosingAndFooter closing={closing} />
    </div>
  );
}
