"use client";

import { FormEvent, useEffect, useState } from "react";
import { useAuth, useClerk } from "@clerk/nextjs";
import { useLocale, useTranslations } from "next-intl";
import Button from "@/components/ui/button/Button";
import { Card } from "@/components/ui/card/Card";
import { Status, StatusState } from "@/components/ui/status/Status";
import { useFormat } from "@/lib/format";
import { CustomerProfile, CustomerRequest, ensureCustomerAccount, listRequests, StaffAccountError, updateProfile } from "@/lib/customer";
import { RequiredMark, RequiredNote } from "@/components/ui/form/Form";
import { Link } from "@/i18n/navigation";
import { toMajor } from "@/lib/currency";
import { call } from "@/components/checkout/http";
import type { CustomerQuote, FreightListItem } from "@/components/services/types";

const input =
  "h-11 w-full rounded-[var(--radius-s)] border border-line-strong bg-surface-raised px-3 text-sm text-ink placeholder:text-ink-muted focus:outline-2 focus:outline-offset-2 focus:outline-focus-ring";

const STATE: Record<CustomerRequest["status"], StatusState> = { OPEN: "planned", MATCHED: "held", CONVERTED: "done", CLOSED: "exception" };

/**
 * Signed out: create an account or sign in (Clerk, in a window over the
 * page). Signed in: the customer account (created on first visit), their
 * contact details, and their requests with where each stands.
 */
export function AccountArea() {
  const t = useTranslations("account");
  const f = useFormat();
  const locale = useLocale();
  const { isLoaded, isSignedIn } = useAuth();
  const clerk = useClerk();
  const [state, setState] = useState<"loading" | "staff" | "failed" | "ready">("loading");
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [requests, setRequests] = useState<CustomerRequest[]>([]);
  const [quotes, setQuotes] = useState<CustomerQuote[]>([]);
  const [freight, setFreight] = useState<FreightListItem[]>([]);
  const [draft, setDraft] = useState({ name: "", phone: "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    ensureCustomerAccount()
      .then(async (p) => [p, ...(await Promise.all([listRequests(), call<{ quotes: CustomerQuote[] }>("GET", "/me/quotes"), call<{ requests: FreightListItem[] }>("GET", "/me/freight-requests")]))] as const)
      .then(([p, list, q, fr]) => {
        setProfile(p);
        setDraft({ name: p.name, phone: p.phone ?? "" });
        setRequests(list);
        setQuotes(q.quotes);
        setFreight(fr.requests);
        setState("ready");
      })
      .catch((err) => setState(err instanceof StaffAccountError ? "staff" : "failed"));
  }, [isLoaded, isSignedIn]);

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      setProfile(await updateProfile({ name: draft.name, phone: draft.phone }));
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  const here = typeof window === "undefined" ? `/${locale}/account` : window.location.href;

  if (!isLoaded) return <p className="text-sm text-ink-muted">{t("loading")}</p>;

  if (!isSignedIn) {
    return (
      <Card padding={32} className="mx-auto max-w-lg text-center">
        <h1 className="rb-headline text-[28px]">{t("signedOut.title")}</h1>
        <p className="mt-2 text-sm text-ink-muted">{t("signedOut.body")}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button onClick={() => clerk.openSignUp({ forceRedirectUrl: here, signInForceRedirectUrl: here })}>{t("signedOut.signUp")}</Button>
          <Button variant="secondary" onClick={() => clerk.openSignIn({ forceRedirectUrl: here, signUpForceRedirectUrl: here })}>
            {t("signedOut.signIn")}
          </Button>
        </div>
      </Card>
    );
  }

  if (state === "loading") return <p className="text-sm text-ink-muted">{t("loading")}</p>;
  if (state === "failed") return <p className="text-sm text-critical">{t("failed")}</p>;
  if (state === "staff") {
    return (
      <Card padding={32} className="mx-auto max-w-lg text-center">
        <p className="rb-title">{t("staff.title")}</p>
        <p className="mt-1 text-sm text-ink-muted">{t("staff.body")}</p>
        <Button href="/dashboard" className="mt-5">
          {t("staff.cta")}
        </Button>
      </Card>
    );
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="rb-overline">{t("title")}</p>
          <h1 className="rb-headline mt-1 text-[32px]">{profile?.name}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button href="/account/orders" variant="secondary">
            {t("orders")}
          </Button>
          <Button href="/business" variant="secondary">
            {t("company")}
          </Button>
          <Button href="/account/company/orders" variant="secondary">
            {t("companyOrders")}
          </Button>
          <Button href="/account/company/staff" variant="secondary">
            {t("colleagues")}
          </Button>
          <Button href="/account/company/cart" variant="secondary">
            {t("bulkOrder")}
          </Button>
          <Button href="/account/company/rfq" variant="secondary">
            {t("rfq")}
          </Button>
          <Button href="/freight" variant="secondary">
            {t("freight.new")}
          </Button>
          <Button href="/find">{t("requests.new")}</Button>
        </div>
      </div>

      {quotes.length ? (
        <Card padding={24}>
          <h2 className="rb-title">{t("quotes.title")}</h2>
          <ol className="mt-3 grid">
            {quotes.map((q) => (
              <li key={q.reference} className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-3 last:border-b-0">
                <div className="min-w-0">
                  <p className="font-semibold text-ink">{q.title}</p>
                  <p className="mt-0.5 text-[13px] text-ink-muted">
                    {[
                      `${f.number(toMajor(q.totals.totalMinor, q.currency))} ${q.currency}`,
                      t(`quotes.status.${q.status}`),
                      q.status === "SENT" && t("quotes.validUntil", { date: f.date(q.validUntil) }),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <Link href={`/account/quotes/${q.reference}`} className="rb-link text-sm">
                  {q.status === "SENT" ? t("quotes.open") : t("quotes.see")}
                </Link>
              </li>
            ))}
          </ol>
        </Card>
      ) : null}

      {freight.length ? (
        <Card padding={24}>
          <h2 className="rb-title">{t("freight.title")}</h2>
          <ol className="mt-3 grid">
            {freight.map((r) => (
              <li key={r.reference} className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-3 last:border-b-0">
                <div className="min-w-0">
                  <p className="font-semibold text-ink">{t("freight.route", { from: r.from, to: r.to })}</p>
                  <p className="mt-0.5 text-[13px] text-ink-muted">
                    {[r.reference, t(`freight.status.${r.status}`), f.dayTime(r.createdAt)].join(" · ")}
                  </p>
                </div>
                <Link href={`/account/freight/${r.reference}`} className="rb-link text-sm">
                  {r.openQuote ? t("freight.quoteWaiting") : t("freight.see")}
                </Link>
              </li>
            ))}
          </ol>
        </Card>
      ) : null}

      <Card padding={24}>
        <h2 className="rb-title">{t("requests.title")}</h2>
        {requests.length === 0 ? (
          <p className="mt-2 text-sm text-ink-muted">{t("requests.empty")}</p>
        ) : (
          <ol className="mt-3 grid">
            {requests.map((r) => (
              <li key={r.id} className="border-b border-line py-4 last:border-b-0">
                <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">{r.description}</p>
                    <p className="mt-0.5 text-[13px] text-ink-muted">
                      {[
                        r.requestType === "SHIP_MY_PRODUCT" && t("requests.ship"),
                        r.destination && t("requests.to", { destination: r.destination }),
                        t("requests.sent", { when: f.dayTime(r.createdAt) }),
                        r.hasPhoto && t("requests.photo"),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    {r.choice && <p className="mt-1 text-sm text-ink">{t("requests.choice", { product: r.choice.title })}</p>}
                  </div>
                  <Status state={STATE[r.status]} label={t(`requests.status.${r.status}`)} />
                </div>
                {r.order && (
                  <p className="mt-2 text-sm">
                    <span className="rb-mono text-ink-muted">{t("requests.order", { reference: r.order.reference })}</span>{" "}
                    <a href={r.order.link} className="rb-link">
                      {t("requests.openOrder")}
                    </a>
                  </p>
                )}
              </li>
            ))}
          </ol>
        )}
      </Card>

      <Card padding={24}>
        <h2 className="rb-title">{t("profile.title")}</h2>
        <p className="mt-1 text-sm text-ink-muted">{t("profile.hint")}</p>
        <form onSubmit={save} className="mt-4 grid gap-3 sm:grid-cols-3 sm:items-end">
          <RequiredNote className="col-span-full" />
          <label className="text-sm">
            <span className="rb-label mb-1 block">{t("profile.name")}<RequiredMark /></span>
            <input required className={input} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} autoComplete="name" />
          </label>
          <label className="text-sm">
            <span className="rb-label mb-1 block">{t("profile.phone")}<RequiredMark /></span>
            <input required type="tel" className={input} value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} autoComplete="tel" />
          </label>
          <label className="text-sm">
            <span className="rb-label mb-1 block">{t("profile.email")}</span>
            <input className={`${input} text-ink-muted`} value={profile?.email ?? ""} readOnly />
          </label>
          <div className="flex items-center gap-3 sm:col-span-3">
            <Button type="submit" loading={saving}>
              {t("profile.save")}
            </Button>
            {saved && <span className="text-sm text-ink-muted">{t("profile.saved")}</span>}
            <button type="button" className="rb-link ml-auto text-sm text-ink-muted" onClick={() => clerk.signOut({ redirectUrl: `/${locale}` })}>
              {t("profile.signOut")}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
