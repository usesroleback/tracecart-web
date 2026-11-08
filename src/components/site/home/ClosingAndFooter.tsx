import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { PillLink } from "./primitives";
import { Reveal } from "./motion";

function FooterLink({ href, children, active = false }: { href: string; children: React.ReactNode; active?: boolean }) {
  const className = `hover:text-[var(--hp-on-dark)] ${active ? "text-[var(--hp-primary)]" : ""}`;
  return href.startsWith("/") ? (
    <Link href={href} className={className}>
      {children}
    </Link>
  ) : (
    <a href={href} className={className}>
      {children}
    </a>
  );
}

/**
 * The footer's dark panel. On the homepage the closing call to action opens
 * it (on /about, the page that explains Tracecart); other pages
 * (`closing={false}`) show the footer alone.
 */
export function ClosingAndFooter({ closing = true }: { closing?: boolean }) {
  const t = useTranslations("home");
  const f = useTranslations("home.footer");

  const links = [
    { label: f("home"), href: "/" },
    { label: f("howItWorks"), href: closing ? "#process" : "/about#process", active: closing },
    { label: f("ship"), href: "/freight" },
    { label: f("sell"), href: "/sell" },
    { label: f("business"), href: "/business" },
    { label: f("carry"), href: "/carry" },
  ];

  return (
    <div className="hp-panel hp-grid-lines mb-[var(--hp-gutter)] overflow-hidden bg-[var(--hp-dark-deep)]">
      {closing && (
      <section aria-labelledby="hp-closing" className="flex flex-col items-center px-6 pb-16 pt-24 text-center sm:pb-24 sm:pt-32">
        <Reveal>
          <h2 id="hp-closing" className="hp-h1 max-w-[14ch]">
            {t("closing.title")}
          </h2>
        </Reveal>
        <PillLink href="#quote" tone="primary" className="hp-sticker relative mt-1 sm:-mt-1">
          {t("closing.cta")}
        </PillLink>
      </section>
      )}

      <footer className="px-6 pb-8 sm:px-10">
        <nav aria-label={f("pages")} className={`pt-12 ${closing ? "border-t border-white/10" : ""}`}>
          <ul className="flex flex-wrap gap-x-8 gap-y-3 text-sm text-[var(--hp-on-dark-muted)]">
            {links.map((l) => (
              <li key={l.label}>
                <FooterLink href={l.href} active={l.active}>
                  {l.label}
                </FooterLink>
              </li>
            ))}
          </ul>
        </nav>

        <Reveal className="mt-16">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/logo/tracecart-lockup-white.svg" alt="Tracecart" width={1200} height={166} className="h-auto w-full opacity-95" />
        </Reveal>

        <div className="mt-8 flex flex-col gap-2 border-t border-white/10 pt-6 text-xs text-[var(--hp-on-dark-muted)] sm:flex-row sm:justify-between">
          <p>{f("copyright", { year: new Date().getFullYear() })}</p>
          <p>{f("byline")}</p>
        </div>
        <p className="mt-4 max-w-3xl text-xs leading-relaxed text-[var(--hp-on-dark-muted)]/80">{f("disclaimer")}</p>
      </footer>
    </div>
  );
}
