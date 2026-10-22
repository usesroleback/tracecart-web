import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ImageSlot, PillLink } from "./primitives";
import { Reveal } from "./motion";

const SOCIALS = ["linkedin", "instagram", "x", "youtube"] as const;
const BADGES = 4;

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
 * it; other pages (`closing={false}`) show the footer alone, with links that
 * lead back to the homepage's sections.
 */
export function ClosingAndFooter({ closing = true }: { closing?: boolean }) {
  const t = useTranslations("home");
  const f = useTranslations("home.footer");

  const columns = [
    {
      title: f("pages"),
      links: [
        { label: f("home"), href: closing ? "#top" : "/", active: closing },
        { label: f("howItWorks"), href: closing ? "#process" : "/#process" },
        { label: f("ship"), href: "/ship" },
        { label: f("insights"), href: closing ? "#insights" : "/#insights" },
      ],
    },
    {
      title: f("support"),
      // TODO: none of these pages exist yet.
      links: [
        { label: f("faq"), href: "#" },
        { label: f("contactUs"), href: "#" },
        { label: f("privacy"), href: "#" },
        { label: f("terms"), href: "#" },
      ],
    },
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
        <div className={`grid gap-12 pt-12 lg:grid-cols-[1.2fr_2fr] ${closing ? "border-t border-white/10" : ""}`}>
          <div>
            <h2 className="text-xl font-semibold">{f("stayTitle")}</h2>
            <p className="mt-2 max-w-sm text-sm text-[var(--hp-on-dark-muted)]">{f("stayBody")}</p>
            {/* TODO: no newsletter service yet, so the form stays disabled. */}
            <form className="mt-5 flex max-w-sm items-center gap-2 rounded-full bg-[var(--hp-dark-raised)] p-1.5 pl-5" aria-describedby="hp-newsletter-soon">
              <label htmlFor="hp-newsletter" className="sr-only">
                {f("emailLabel")}
              </label>
              <input
                id="hp-newsletter"
                type="email"
                disabled
                placeholder={f("emailPlaceholder")}
                className="min-w-0 flex-1 bg-transparent text-sm text-[var(--hp-on-dark)] placeholder:text-[var(--hp-on-dark-muted)] disabled:cursor-not-allowed"
              />
              <button type="submit" disabled aria-label={f("subscribe")} className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--hp-primary)] text-[var(--hp-on-primary)] disabled:opacity-60">
                <svg viewBox="0 0 16 16" aria-hidden className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 8h10M9 4l4 4-4 4" />
                </svg>
              </button>
            </form>
            <p id="hp-newsletter-soon" className="mt-2 pl-5 text-xs text-[var(--hp-on-dark-muted)]">
              {f("subscribeSoon")}
            </p>
            <p className="mt-6 text-sm text-[var(--hp-on-dark-muted)]">{f("follow")}</p>
            <ul className="mt-3 flex gap-2">
              {SOCIALS.map((s) => (
                <li key={s}>
                  {/* TODO: social profile links. */}
                  <a href="#" aria-label={s} className="grid size-10 place-items-center rounded-xl bg-[var(--hp-dark-raised)] hover:bg-white/15">
                    <ImageSlot name={`social-${s}`} alt="" tone="dark" className="size-5 rounded [&>span]:hidden" />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            {columns.map((c) => (
              <nav key={c.title} aria-label={c.title}>
                <h3 className="text-sm font-semibold">{c.title}</h3>
                <ul className="mt-4 space-y-2.5 text-sm text-[var(--hp-on-dark-muted)]">
                  {c.links.map((l) => (
                    <li key={l.label}>
                      <FooterLink href={l.href} active={"active" in l && l.active}>
                        {l.label}
                      </FooterLink>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
            <div>
              <h3 className="text-sm font-semibold">{f("contact")}</h3>
              <ul className="mt-4 space-y-2.5 text-sm text-[var(--hp-on-dark-muted)]">
                <li>
                  <a href={`mailto:${f("email")}`} data-placeholder="contact" className="hover:text-[var(--hp-on-dark)]">
                    {f("email")}
                  </a>
                </li>
                <li data-placeholder="contact" className="rb-mono-s">
                  {f("phone")}
                </li>
                <li className="rb-mono-s">{f("cities")}</li>
              </ul>
            </div>
          </div>
        </div>

        <Reveal className="mt-16">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/logo/tracecart-lockup-white.svg" alt="TraceCart" width={1200} height={166} className="h-auto w-full opacity-95" />
        </Reveal>

        <ul aria-label={f("badgesLabel")} className="mt-12 flex flex-wrap gap-3">
          {Array.from({ length: BADGES }, (_, i) => (
            <li key={i}>
              <ImageSlot name={`badge-${i + 1}`} ratio="2/1" alt={f("badgeAlt")} className="w-28 rounded-xl bg-white [&>span]:text-[9px]" />
            </li>
          ))}
        </ul>

        <div className="mt-8 flex flex-col gap-2 border-t border-white/10 pt-6 text-xs text-[var(--hp-on-dark-muted)] sm:flex-row sm:justify-between">
          <p>{f("copyright", { year: new Date().getFullYear() })}</p>
          <p>{f("byline")}</p>
        </div>
        <p className="mt-4 max-w-3xl text-xs leading-relaxed text-[var(--hp-on-dark-muted)]/80">{f("disclaimer")}</p>
      </footer>
    </div>
  );
}
