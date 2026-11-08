"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { ApiError, call } from "@/components/checkout/http";
import { compared, forgetSeen, MAX_COMPARE, rememberSeen, SHELF_EVENT, toggleCompare } from "@/lib/shelf";

// "Save" (the account's wish list, ADR-078) and "Compare" (a list kept on this
// device) for a product, on its card or its page. The store's pages load no
// Clerk (see the (store) layout), so the wish list goes through the API proxy,
// which knows the session; signed out, Save leads to the Saved page, which
// signs in and then saves.

/** Clerk's readable marker of a session in this browser ("0" or absent: none). */
const maybeSignedIn = () => /(?:^|; )__client_uat(?:_[A-Za-z0-9-]+)?=[1-9]/.test(document.cookie);

let savedSkus: Promise<Set<string>> | null = null;
const listeners = new Set<() => void>();
function loadSaved(): Promise<Set<string>> {
  savedSkus ??= call<{ items: { sku: string }[] }>("GET", "/me/wishlist")
    .then((w) => new Set(w.items.map((i) => i.sku)))
    .catch(() => new Set<string>());
  return savedSkus;
}

function subscribeShelf(cb: () => void) {
  window.addEventListener(SHELF_EVENT, cb);
  return () => window.removeEventListener(SHELF_EVENT, cb);
}
const compareSnapshot = () => compared().join(".");

/** Whether these slugs are in the compare list, kept in step with every other button. */
export function useCompared(): string[] {
  const raw = useSyncExternalStore(subscribeShelf, compareSnapshot, () => "");
  return raw ? raw.split(".") : [];
}

const iconButton =
  "relative z-20 inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-xs)] border border-line bg-surface-raised/95 px-2.5 text-xs font-medium text-ink backdrop-blur hover:border-ink aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-ink-inverse disabled:opacity-50";

export function SaveCompare({ slug, sku, title, layout = "card" }: { slug: string; sku: string; title: string; layout?: "card" | "page" }) {
  const t = useTranslations("store.card");
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const list = useCompared();
  const inCompare = list.includes(slug);
  const full = !inCompare && list.length >= MAX_COMPARE;

  useEffect(() => {
    if (!maybeSignedIn()) return;
    let live = true;
    const sync = () => loadSaved().then((s) => live && setSaved(s.has(sku)));
    sync();
    listeners.add(sync);
    return () => {
      live = false;
      listeners.delete(sync);
    };
  }, [sku]);

  async function save() {
    const signIn = () => router.push(`/account/saved?add=${encodeURIComponent(sku)}`);
    if (!maybeSignedIn()) return signIn();
    setBusy(true);
    try {
      const w = await call<{ items: { sku: string }[] }>(saved ? "DELETE" : "POST", saved ? `/me/wishlist/${encodeURIComponent(sku)}` : "/me/wishlist", saved ? undefined : { sku });
      savedSkus = Promise.resolve(new Set(w.items.map((i) => i.sku)));
      listeners.forEach((l) => l());
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) signIn();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={layout === "card" ? "flex gap-1.5" : "flex flex-wrap gap-2"}>
      <button type="button" onClick={save} disabled={busy} aria-pressed={saved} className={iconButton} aria-label={layout === "card" ? `${saved ? t("saved") : t("save")}: ${title}` : undefined}>
        <svg viewBox="0 0 20 20" aria-hidden className="size-4" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.7">
          <path d="M10 16.5s-6-3.6-6-8.1A3.4 3.4 0 0 1 10 6a3.4 3.4 0 0 1 6 2.4c0 4.5-6 8.1-6 8.1Z" strokeLinejoin="round" />
        </svg>
        <span className={layout === "card" ? "sr-only" : undefined}>{saved ? t("saved") : t("save")}</span>
      </button>
      <button
        type="button"
        onClick={() => toggleCompare(slug)}
        disabled={full}
        aria-pressed={inCompare}
        title={full ? t("compareFull", { max: MAX_COMPARE }) : undefined}
        className={iconButton}
        aria-label={layout === "card" ? `${t("compare")}: ${title}` : undefined}
      >
        <svg viewBox="0 0 20 20" aria-hidden className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7">
          <path d="M4 5h5v11H4zM11 8h5v8h-5z" strokeLinejoin="round" />
        </svg>
        <span className={layout === "card" ? "sr-only" : undefined}>{t("compare")}</span>
      </button>
    </div>
  );
}

/** Empties "Recently viewed" on this device. */
export function ForgetSeen({ label }: { label: string }) {
  const router = useRouter();
  return (
    <button type="button" onClick={() => (forgetSeen(), router.refresh())} className="text-sm text-ink-muted underline hover:text-ink">
      {label}
    </button>
  );
}

/** On a product page: remembers it for "Recently viewed" (a cookie on this device). */
export function RememberSeen({ slug }: { slug: string }) {
  useEffect(() => rememberSeen(slug), [slug]);
  return null;
}
