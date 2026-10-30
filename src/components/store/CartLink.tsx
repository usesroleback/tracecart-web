"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CART_EVENT, getCart } from "@/lib/cart";

/** The header's cart link, with the number of items once known. */
export function CartLink({ className = "" }: { className?: string }) {
  const t = useTranslations("checkout.cart");
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    const onChange = (e: Event) => setCount((e as CustomEvent<number>).detail);
    window.addEventListener(CART_EVENT, onChange);
    getCart().catch(() => undefined);
    return () => window.removeEventListener(CART_EVENT, onChange);
  }, []);

  return (
    <Link href="/cart" className={`relative inline-flex items-center gap-1.5 ${className}`} aria-label={count ? t("linkWithCount", { count }) : t("link")}>
      <svg viewBox="0 0 20 20" aria-hidden className="size-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
        <path d="M2.5 3.5h2l1.8 9h9l1.7-6.5H5.4" />
        <circle cx="8" cy="16" r="1.2" />
        <circle cx="14.5" cy="16" r="1.2" />
      </svg>
      {count ? <span className="rb-mono-s grid min-w-5 place-items-center rounded-full bg-ink px-1 text-[11px] text-ink-inverse">{count}</span> : null}
    </Link>
  );
}
