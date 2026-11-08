"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth, useClerk } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import { Link, useRouter } from "@/i18n/navigation";
import { call } from "@/components/checkout/http";

type Saved = { items: { sku: string; productSlug: string; title: string; image: string | null; onSale: boolean; addedAt: string }[] };

/**
 * The account's wish list (ADR-078): what was saved with "Save", on any device.
 * Save on a store page while signed out leads here with `?add=<sku>`: once
 * signed in, that product is saved first.
 */
export function SavedList() {
  const t = useTranslations("store.saved");
  const { isLoaded, isSignedIn } = useAuth();
  const clerk = useClerk();
  const [data, setData] = useState<Saved | null>(null);
  const [error, setError] = useState<string | null>(null);
  const add = useSearchParams().get("add");
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    (add ? call<Saved>("POST", "/me/wishlist", { sku: add.slice(0, 64) }).finally(() => router.replace("/account/saved")) : call<Saved>("GET", "/me/wishlist"))
      .then(setData)
      .catch((e) => setError((e as Error).message));
  }, [isLoaded, isSignedIn, add, router]);

  async function remove(sku: string) {
    setData(await call<Saved>("DELETE", `/me/wishlist/${encodeURIComponent(sku)}`));
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="rb-headline text-[30px] sm:text-[40px]">{t("title")}</h1>
      {!isLoaded ? null : !isSignedIn ? (
        <button type="button" className="self-start rounded-[var(--radius-s)] bg-ink px-5 py-3 font-medium text-ink-inverse" onClick={() => clerk.openSignIn({ forceRedirectUrl: window.location.href })}>
          {t("signIn")}
        </button>
      ) : error ? (
        <p className="text-critical">{error}</p>
      ) : !data ? (
        <p className="text-ink-muted">{t("loading")}</p>
      ) : data.items.length === 0 ? (
        <p className="text-ink-muted">
          {t("empty")}{" "}
          <Link href="/c" className="font-medium text-ink underline">
            {t("browse")}
          </Link>
        </p>
      ) : (
        <ul className="divide-y divide-line rounded-[var(--radius-m)] border border-line bg-surface-raised">
          {data.items.map((i) => (
            <li key={i.sku} className="flex items-center gap-4 px-4 py-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {i.image ? <img src={i.image} alt="" className="size-14 shrink-0 rounded-[var(--radius-xs)] object-cover" /> : <span className="size-14 shrink-0 rounded-[var(--radius-xs)] bg-surface-sunken" />}
              <div className="min-w-0 flex-1">
                {i.onSale ? (
                  <Link href={`/p/${i.productSlug}`} className="font-medium text-ink underline-offset-4 hover:underline">
                    {i.title}
                  </Link>
                ) : (
                  <span className="font-medium text-ink">{i.title}</span>
                )}
                <p className="rb-mono-s text-ink-muted">
                  {i.sku}
                  {i.onSale ? "" : ` · ${t("gone")}`}
                </p>
              </div>
              <button type="button" onClick={() => remove(i.sku)} className="text-sm text-ink-muted underline hover:text-ink" aria-label={t("removeLabel", { title: i.title })}>
                {t("remove")}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
