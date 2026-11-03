"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useSession } from "@/context/SessionContext";
import { DsSearchIcon } from "@/icons";
import { call } from "@/components/checkout/http";
import { allowedNav } from "@/layout/nav";

// Global search and the console's keyboard shortcuts (ADR-049). The API searches
// as this person would list (GET /me/search), so results stay within their scope.

interface Hit {
  kind: "order" | "shipment" | "return" | "product";
  id: string;
  title: string;
  subtitle: string | null;
}

interface Item {
  key: string;
  title: string;
  subtitle: string | null;
  href: string;
}

const HREF: Record<Hit["kind"], (id: string) => string> = {
  order: (id) => `/store-orders/${id}`,
  shipment: (id) => `/shipments/${id}`,
  return: (id) => `/returns/${id}`,
  product: (id) => `/catalog/products/${id}`,
};

// Press g, then one of these. Offered only where the sidebar offers the page.
const GO_TO: Record<string, string> = { d: "/dashboard", o: "/store-orders", s: "/shipments", r: "/returns", i: "/inventory", p: "/purchasing", c: "/catalog" };

const isTyping = (target: EventTarget | null) => {
  const el = target as HTMLElement | null;
  return !!el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));
};

export function CommandPalette() {
  const t = useTranslations("console.search");
  const tk = useTranslations("console.keys");
  const tn = useTranslations("common.nav");
  const user = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [help, setHelp] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [searching, setSearching] = useState(false);
  const [failed, setFailed] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const opener = useRef<HTMLElement | null>(null);

  const pages = useMemo(() => allowedNav(user).flatMap((g) => g.items), [user]);
  const shortcuts = useMemo(() => Object.entries(GO_TO).filter(([, path]) => pages.some((p) => p.path === path)), [pages]);

  const show = useCallback(() => {
    opener.current = document.activeElement as HTMLElement | null;
    setOpen(true);
  }, []);
  const close = useCallback(() => {
    setOpen(false);
    setHelp(false);
    setQ("");
    setHits([]);
    setActive(0);
    opener.current?.focus?.();
  }, []);

  useEffect(() => {
    let leader = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        show();
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target)) return;
      if (leader) {
        leader = false;
        clearTimeout(timer);
        const path = GO_TO[e.key.toLowerCase()];
        if (path && pages.some((p) => p.path === path)) router.push(path);
        return;
      }
      if (e.key === "/") {
        e.preventDefault();
        show();
      } else if (e.key === "?") {
        opener.current = document.activeElement as HTMLElement | null;
        setHelp(true);
      } else if (e.key.toLowerCase() === "g") {
        leader = true;
        timer = setTimeout(() => {
          leader = false;
        }, 1500);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      clearTimeout(timer);
    };
  }, [pages, router, show]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Waits for a pause in typing; an answer to an older search is dropped.
  useEffect(() => {
    const term = q.trim();
    if (!open || term.length < 2) return;
    let stale = false;
    const timer = setTimeout(() => {
      setSearching(true);
      setFailed(false);
      call<{ items: Hit[] }>("GET", `/me/search?q=${encodeURIComponent(term)}`)
        .then((res) => {
          if (!stale) setHits(res.items);
        })
        .catch(() => {
          if (!stale) setFailed(true);
        })
        .finally(() => {
          if (!stale) setSearching(false);
        });
    }, 250);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [q, open]);

  const term = q.trim().toLowerCase();
  const items: Item[] = [
    ...pages.filter((p) => tn(p.name).toLowerCase().includes(term)).map((p) => ({ key: `page:${p.name}`, title: tn(p.name), subtitle: t("page"), href: p.path })),
    ...(term.length >= 2 ? hits.map((h) => ({ key: `${h.kind}:${h.id}`, title: h.title, subtitle: [t(`kinds.${h.kind}`), h.subtitle].filter(Boolean).join(" · "), href: HREF[h.kind](h.id) })) : []),
  ];
  const selected = Math.min(active, Math.max(items.length - 1, 0));

  function go(item: Item) {
    close();
    router.push(item.href);
  }

  function onInputKey(e: ReactKeyboardEvent) {
    if (e.key === "Escape") close();
    else if (e.key === "ArrowDown" && items.length) {
      e.preventDefault();
      setActive((selected + 1) % items.length);
    } else if (e.key === "ArrowUp" && items.length) {
      e.preventDefault();
      setActive((selected - 1 + items.length) % items.length);
    } else if (e.key === "Enter" && items[selected]) {
      e.preventDefault();
      go(items[selected]);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={show}
        aria-label={t("open")}
        title={t("open")}
        className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-s)] border border-line text-ink-muted hover:bg-surface-sunken hover:text-ink"
      >
        <DsSearchIcon aria-hidden />
      </button>
      {open
        ? createPortal(
            <div className="fixed inset-0 z-[100000] bg-black/40 p-4 sm:pt-24" onMouseDown={close}>
              <div role="dialog" aria-modal="true" aria-label={t("open")} className="mx-auto w-full max-w-xl overflow-hidden rounded-[var(--radius-m)] border border-line bg-surface-raised text-ink shadow-lg" onMouseDown={(e) => e.stopPropagation()}>
                <input
                  ref={inputRef}
                  role="combobox"
                  aria-expanded
                  aria-controls="console-search-results"
                  aria-activedescendant={items[selected] ? `console-search-${selected}` : undefined}
                  aria-label={t("open")}
                  autoComplete="off"
                  className="w-full border-b border-line bg-transparent px-4 py-3 text-sm outline-none"
                  placeholder={t("placeholder")}
                  value={q}
                  maxLength={100}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setActive(0);
                    if (e.target.value.trim().length < 2) {
                      setHits([]);
                      setFailed(false);
                    }
                  }}
                  onKeyDown={onInputKey}
                />
                <ul id="console-search-results" role="listbox" aria-label={t("results")} className="max-h-[50vh] overflow-y-auto py-1">
                  {items.map((item, i) => (
                    <li
                      key={item.key}
                      id={`console-search-${i}`}
                      role="option"
                      aria-selected={i === selected}
                      className={`cursor-pointer px-4 py-2 text-sm ${i === selected ? "bg-surface-sunken" : ""}`}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => go(item)}
                    >
                      <span className="font-medium">{item.title}</span>
                      {item.subtitle ? <span className="block text-xs text-ink-muted">{item.subtitle}</span> : null}
                    </li>
                  ))}
                </ul>
                <p aria-live="polite" className="border-t border-line px-4 py-2 text-xs text-ink-muted">
                  {failed ? t("failed") : searching ? t("searching") : !items.length ? t("none") : t("hint")}
                </p>
              </div>
            </div>,
            document.body
          )
        : null}
      {help
        ? createPortal(
            <div
              className="fixed inset-0 z-[100000] bg-black/40 p-4 sm:pt-24"
              onMouseDown={close}
              onKeyDown={(e) => {
                if (e.key === "Escape") close();
              }}
            >
              <div role="dialog" aria-modal="true" aria-label={tk("title")} className="mx-auto w-full max-w-md rounded-[var(--radius-m)] border border-line bg-surface-raised p-5 text-sm text-ink shadow-lg" onMouseDown={(e) => e.stopPropagation()}>
                <h2 className="rb-title mb-3">{tk("title")}</h2>
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
                  <dt className="rb-mono-s">Ctrl K, /</dt>
                  <dd>{t("open")}</dd>
                  <dt className="rb-mono-s">?</dt>
                  <dd>{tk("help")}</dd>
                  {shortcuts.map(([key, path]) => (
                    <div key={key} className="contents">
                      <dt className="rb-mono-s">g {key}</dt>
                      <dd>{tn(pages.find((p) => p.path === path)!.name)}</dd>
                    </div>
                  ))}
                </dl>
                <button type="button" autoFocus className="mt-4 underline" onClick={close}>
                  {tk("close")}
                </button>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
