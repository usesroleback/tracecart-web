"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth, useClerk } from "@clerk/nextjs";
import { Link } from "@/i18n/navigation";
import { useFormat } from "@/lib/format";
import { toMajor } from "@/lib/currency";
import { call } from "./http";

interface Mine {
  orders: { reference: string; status: string; createdAt: string; totalMinor: number; currency: string; itemCount: number; firstItem: string | null }[];
  legacy: { reference: string; status: string; createdAt: string; product: string; total: number | null; currency: string | null; link: string }[];
}

/** The customer's orders, and those from before the store (with their tracking page). */
export function OrdersList() {
  const t = useTranslations("checkout.orders");
  const ts = useTranslations("checkout.order.status");
  const format = useFormat();
  const { isLoaded, isSignedIn } = useAuth();
  const clerk = useClerk();
  const [data, setData] = useState<Mine | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    call<Mine>("GET", "/me/orders")
      .then(setData)
      .catch((e) => setError((e as Error).message));
  }, [isLoaded, isSignedIn]);

  if (!isLoaded) return null;
  if (!isSignedIn) {
    return (
      <button type="button" className="rounded-[var(--radius-s)] bg-ink px-5 py-3 font-medium text-ink-inverse" onClick={() => clerk.openSignIn({ forceRedirectUrl: window.location.href })}>
        {t("signIn")}
      </button>
    );
  }
  if (error) return <p className="text-critical">{error}</p>;
  if (!data) return <p className="text-ink-muted">{t("loading")}</p>;

  return (
    <div className="flex flex-col gap-8">
      <h1 className="rb-headline text-[30px] sm:text-[40px]">{t("title")}</h1>
      {data.orders.length === 0 && data.legacy.length === 0 ? (
        <p className="text-ink-muted">
          {t("empty")}{" "}
          <Link href="/c" className="font-medium text-ink underline">
            {t("browse")}
          </Link>
        </p>
      ) : null}
      {data.orders.length ? (
        <ul className="divide-y divide-line rounded-[var(--radius-m)] border border-line bg-surface-raised">
          {data.orders.map((o) => (
            <li key={o.reference}>
              <Link href={`/account/orders/${o.reference}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-surface-sunken">
                <span className="rb-mono-s">{o.reference}</span>
                <span className="min-w-0 flex-1 truncate">
                  {o.firstItem}
                  {o.itemCount > 1 ? ` ${t("andMore", { count: o.itemCount - 1 })}` : ""}
                </span>
                <span className="text-sm text-ink-muted">{format.date(o.createdAt)}</span>
                <span className="text-sm">{ts(o.status as "PLACED")}</span>
                <span className="rb-numeral font-semibold">
                  {format.number(toMajor(o.totalMinor, o.currency))} {o.currency}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
      {data.legacy.length ? (
        <section>
          <h2 className="rb-title mb-2">{t("legacy")}</h2>
          <ul className="divide-y divide-line rounded-[var(--radius-m)] border border-line bg-surface-raised">
            {data.legacy.map((o) => (
              <li key={o.reference}>
                <a href={o.link} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-surface-sunken">
                  <span className="rb-mono-s">{o.reference}</span>
                  <span className="min-w-0 flex-1 truncate">{o.product}</span>
                  <span className="text-sm text-ink-muted">{format.date(o.createdAt)}</span>
                  {o.total != null ? <span className="rb-numeral">{format.money(o.total, o.currency)}</span> : null}
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
