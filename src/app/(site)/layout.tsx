import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TraceCart — Get it there.",
  description:
    "Sourcing and cross-border logistics for landlocked and difficult-to-reach markets. Tell us what needs to move — we'll work out the route.",
};

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return <div className="bg-surface text-ink">{children}</div>;
}
