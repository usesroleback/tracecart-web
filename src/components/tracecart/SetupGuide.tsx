"use client";

import { Fragment } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { useSession } from "@/context/SessionContext";
import { Alert } from "@/components/ui/alert/Alert";
import { Badge } from "@/components/ui/badge/Badge";
import { Card } from "@/components/ui/card/Card";
import { DsCheckIcon } from "@/icons";
import { Readiness, useReadiness } from "@/lib/readiness";

type Need = "required" | "recommended";
type Step = { key: "hub" | "routes" | "exchangeRates" | "margins" | "inbound" | "customs"; need: Need; done: boolean; href: string; detail?: string };

/** What the shop needs set, in the order to set it: each step is used by the next. */
function useSteps(r: Readiness): Step[] {
  const t = useTranslations("pricing.setup");
  const currency = r.hub?.currency ?? "";
  return [
    { key: "hub", need: "required", done: r.hub != null, href: "/hub-setup", detail: r.hub ? t("detail.hub", { hub: r.hub.name, currency }) : undefined },
    {
      key: "routes",
      need: "required",
      done: r.routes.priced > 0,
      href: "/carriers",
      detail:
        r.routes.priced > 0
          ? t("detail.routes", { count: r.routes.priced, countries: r.routes.countries.join(", ") })
          : r.routes.withoutRates > 0
            ? t("detail.routesWithoutRates", { count: r.routes.withoutRates })
            : undefined,
    },
    {
      key: "exchangeRates",
      need: "required",
      done: r.hub != null && r.exchangeRates.missing.length === 0,
      href: "/pricing#exchange-rates",
      detail: r.exchangeRates.missing.length ? t("detail.missingRates", { pairs: r.exchangeRates.missing.map((p) => `${p.from} → ${p.to}`).join(", ") }) : undefined,
    },
    { key: "margins", need: "recommended", done: r.margins.set, href: "/pricing#margins" },
    {
      key: "inbound",
      need: "required",
      done: r.inbound.missingHubs.length === 0,
      // Own hub set, another still waiting: straight to the other hubs.
      href: r.inbound.set && r.inbound.missingHubs.length ? "/pricing#other-hubs" : "/pricing#margins",
      detail: r.inbound.missingHubs.length ? t("detail.missingInbound", { hubs: r.inbound.missingHubs.join(", ") }) : undefined,
    },
    {
      key: "customs",
      need: "required",
      done: r.customs.missingCountries.length === 0 && r.customsRates > 0,
      href: "/pricing#customs-rates",
      detail: r.customs.missingCountries.length ? t("detail.missingCustoms", { countries: r.customs.missingCountries.join(", ") }) : undefined,
    },
  ];
}

/**
 * Across the console, to the administrateur, while the shop can't price a
 * product: what's missing, each a link to where it's set.
 */
export function SetupBanner() {
  const user = useSession();
  const pathname = usePathname();
  const isAdmin = user.role === "SUPER_ADMIN";
  // Checked again on each page: a step done elsewhere takes the banner down.
  const readiness = useReadiness(isAdmin, pathname);
  // The pricing page shows the full checklist instead.
  if (!readiness || readiness.ready || pathname.startsWith("/pricing")) return null;
  return <Banner readiness={readiness} />;
}

function Banner({ readiness }: { readiness: Readiness }) {
  const t = useTranslations("pricing.setup");
  const missing = useSteps(readiness).filter((s) => s.need === "required" && !s.done);
  return (
    <Alert
      tone="warning"
      title={t("banner.title")}
      className="mb-6"
      action={
        <Link href="/pricing" className="rb-link text-sm font-semibold whitespace-nowrap">
          {t("banner.action")}
        </Link>
      }
    >
      {t("banner.lead")}{" "}
      {missing.map((s, i) => (
        <Fragment key={s.key}>
          {i > 0 && " · "}
          <Link href={s.href} className="underline underline-offset-2">
            {t(`steps.${s.key}.title`)}
          </Link>
          {/* Why it isn't done, when that's known (e.g. routes saved without weight bands). */}
          {s.detail && s.key !== "hub" && <span className="text-ink-muted"> ({s.detail})</span>}
        </Fragment>
      ))}
    </Alert>
  );
}

/** At the top of the pricing page: every step, done or not, in order. */
export function SetupChecklist({ readiness }: { readiness: Readiness | null }) {
  if (!readiness) return null;
  return <Checklist readiness={readiness} />;
}

function Checklist({ readiness }: { readiness: Readiness }) {
  const t = useTranslations("pricing.setup");
  const steps = useSteps(readiness);
  return (
    <Card padding={24} className="mt-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="rb-headline text-xl">{t("title")}</h2>
        {readiness.ready ? <Badge variant="positive">{t("ready")}</Badge> : <Badge variant="attn">{t("notReady")}</Badge>}
      </div>
      <p className="mt-1 max-w-3xl text-sm text-ink-muted">{t("intro")}</p>
      <ol className="mt-4 grid gap-2">
        {steps.map((s, i) => (
          <li key={s.key} className="flex items-start gap-3 rounded-[var(--radius-m)] border border-line p-3">
            <span
              aria-hidden
              className={`flex h-7 w-7 flex-none items-center justify-center rounded-full text-sm font-semibold ${s.done ? "bg-positive-soft text-positive" : "bg-surface-sunken text-ink"}`}
            >
              {s.done ? <DsCheckIcon width={16} height={16} /> : i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Link href={s.href} className="font-semibold hover:underline">
                  {t(`steps.${s.key}.title`)}
                </Link>
                <Badge variant={s.need === "required" ? "outline" : "default"}>{t(`need.${s.need}`)}</Badge>
                <span className="sr-only">{s.done ? t("done") : t("todo")}</span>
              </div>
              <p className="mt-0.5 text-sm text-ink-muted">{s.detail ?? t(`steps.${s.key}.hint`)}</p>
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}
