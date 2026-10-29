"use client";

import { FormEvent, KeyboardEvent, useEffect, useId, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { browserApi } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";
import { useCountry } from "@/context/CountryContext";

type Suggestions = components["schemas"]["SearchSuggestions"];
type Option = { href: string; label: string; kind: "product" | "category" | "brand" | "all"; image?: string | null };

const DEBOUNCE_MS = 150;

/**
 * The catalogue search box. Without JavaScript it is a plain form to /s;
 * with it, suggestions appear as one types (a combobox: arrows to move,
 * Enter to open, Escape to close).
 */
export function SearchBox({ initialQuery = "", autoFocus = false, size = "m" }: { initialQuery?: string; autoFocus?: boolean; size?: "m" | "l" }) {
  const t = useTranslations("store.nav");
  const locale = useLocale();
  const router = useRouter();
  const { country } = useCountry();
  const id = useId();
  const [query, setQuery] = useState(initialQuery);
  const [data, setData] = useState<Suggestions | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const seq = useRef(0);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query.trim();
    // Under two letters the list is hidden (showList), so nothing to fetch.
    if (q.length < 2) return;
    const mine = ++seq.current;
    const timer = setTimeout(async () => {
      const { data } = await browserApi.GET("/catalog/suggest", { params: { query: { q, country: country ?? undefined, currency: "XOF" } } }).catch(() => ({ data: undefined }));
      // A slower answer to an earlier query never replaces a newer one.
      if (mine === seq.current && data) setData(data);
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, country]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const q = query.trim();
  const options: Option[] = data
    ? [
        ...data.products.map((p) => ({ href: `/p/${p.slug}`, label: p.title, kind: "product" as const, image: p.image?.url })),
        ...data.categories.map((c) => ({ href: `/c/${c.slug}`, label: c.name, kind: "category" as const })),
        ...data.brands.map((b) => ({ href: `/b/${b.slug}`, label: b.name, kind: "brand" as const })),
        { href: `/s?q=${encodeURIComponent(q)}`, label: t("seeAll", { query: q }), kind: "all" as const },
      ]
    : [];
  const showList = open && q.length >= 2 && options.length > 0;

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (showList && active >= 0) return go(options[active].href);
    if (q) go(`/s?q=${encodeURIComponent(q)}`);
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(a + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, -1));
    } else if (e.key === "Escape") {
      setOpen(false);
      setActive(-1);
    }
  }

  const group = (kind: Option["kind"], title: string) => {
    const items = options.map((o, i) => ({ o, i })).filter(({ o }) => o.kind === kind);
    if (!items.length) return null;
    return (
      <li role="presentation">
        {kind !== "all" ? <p className="rb-overline px-3 pb-1 pt-3 text-ink-muted">{title}</p> : null}
        <ul role="group" aria-label={title}>
          {items.map(({ o, i }) => (
            <li
              key={o.href}
              id={`${id}-opt-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => go(o.href)}
              onMouseEnter={() => setActive(i)}
              className={`flex cursor-pointer items-center gap-3 px-3 py-2 text-sm ${i === active ? "bg-surface-sunken" : ""} ${kind === "all" ? "border-t border-line font-medium" : ""}`}
            >
              {kind === "product" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={o.image ?? ""} alt="" width={36} height={36} className="size-9 shrink-0 rounded-[var(--radius-xs)] bg-surface-sunken object-contain" />
              ) : null}
              <span className="line-clamp-2">{o.label}</span>
            </li>
          ))}
        </ul>
      </li>
    );
  };

  const height = size === "l" ? "h-14 text-base" : "h-11 text-[15px]";
  return (
    <div ref={box} className="relative w-full">
      <form role="search" action={`/${locale}/s`} method="get" onSubmit={submit} className="flex w-full">
        <label htmlFor={`${id}-q`} className="sr-only">
          {t("searchLabel")}
        </label>
        <input
          id={`${id}-q`}
          name="q"
          type="search"
          value={query}
          autoFocus={autoFocus}
          autoComplete="off"
          enterKeyHint="search"
          maxLength={200}
          placeholder={t("searchPlaceholder")}
          role="combobox"
          aria-expanded={showList}
          aria-controls={`${id}-list`}
          aria-autocomplete="list"
          aria-activedescendant={showList && active >= 0 ? `${id}-opt-${active}` : undefined}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKey}
          className={`${height} min-w-0 flex-1 rounded-l-[var(--radius-s)] border border-r-0 border-line-strong bg-surface-raised px-4 text-ink placeholder:text-ink-muted focus:border-ink focus:outline-none`}
        />
        <button type="submit" className={`${height} shrink-0 rounded-r-[var(--radius-s)] bg-ink px-4 font-medium text-ink-inverse hover:opacity-90 sm:px-5`}>
          <span className="sr-only sm:not-sr-only">{t("search")}</span>
          <svg viewBox="0 0 20 20" aria-hidden className="size-5 sm:hidden" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="9" cy="9" r="5.5" />
            <path d="m13.5 13.5 3.5 3.5" strokeLinecap="round" />
          </svg>
        </button>
      </form>
      {showList ? (
        <ul id={`${id}-list`} role="listbox" aria-label={t("suggestions")} className="absolute inset-x-0 top-full z-40 mt-1 max-h-[70vh] overflow-y-auto rounded-[var(--radius-s)] border border-line bg-surface-raised pb-1 shadow-[var(--shadow-1)]">
          {data?.correctedQuery ? <li role="presentation" className="px-3 pt-3 text-sm text-ink-muted">{t("didYouMean", { query: data.correctedQuery })}</li> : null}
          {group("product", t("suggestedProducts"))}
          {group("category", t("suggestedCategories"))}
          {group("brand", t("suggestedBrands"))}
          {group("all", "")}
        </ul>
      ) : null}
    </div>
  );
}
