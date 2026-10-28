"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import Button from "@/components/ui/button/Button";
import { Card } from "@/components/ui/card/Card";
import { useCountry } from "@/context/CountryContext";
import { api } from "@/lib/apiClient";
import { BuyPanel, PriceBlock, ShopPrice } from "./ShopBuy";

interface Featured {
  query: string;
  url: string;
  title: string;
  imageUrl: string | null;
  price: ShopPrice | null;
  offer: string | null;
}

// While the products are being searched (first visit of the day), ask again a few times.
const RETRY_MS = 20_000;
const MAX_TRIES = 6;

/**
 * What the shop shows before anyone searches (GET /shop/featured): popular
 * products found live, priced delivered to the visitor's country, to buy
 * like any search result.
 */
export function FeaturedProducts() {
  const t = useTranslations("shop.featured");
  const { country } = useCountry();
  const [result, setResult] = useState<{ country: string | null; items: Featured[]; pending: boolean } | null>(null);
  const [buying, setBuying] = useState<Featured | null>(null);

  useEffect(() => {
    let tries = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;
    const load = () =>
      api
        .get<{ items: Featured[]; pending: boolean }>(`/shop/featured${country ? `?country=${country}` : ""}`)
        .then((r) => {
          if (stopped) return;
          setResult({ country, ...r });
          if (r.pending && ++tries < MAX_TRIES) timer = setTimeout(load, RETRY_MS);
        })
        .catch(() => !stopped && setResult({ country, items: [], pending: false }));
    load();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [country]);

  const current = result?.country === country ? result : null;
  if (current && !current.pending && current.items.length === 0) return null;

  return (
    <section className="mt-12" aria-labelledby="featured-title">
      <h2 id="featured-title" className="rb-headline text-2xl">
        {t("title")}
      </h2>

      {buying?.offer && buying.price && country && (
        <BuyPanel key={buying.url} title={buying.title} offer={buying.offer} country={country} initialPrice={buying.price} onClose={() => setBuying(null)} />
      )}

      {!current || current.pending ? (
        <>
          <ul className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4" aria-hidden>
            {Array.from({ length: 4 }, (_, i) => (
              <li key={i} className="h-72 animate-pulse rounded-[var(--radius-m)] bg-surface-sunken" />
            ))}
          </ul>
          {current?.pending && <p className="mt-3 text-sm text-ink-muted">{t("pending")}</p>}
        </>
      ) : (
        <ul className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {current.items.map((item) => (
            <li key={item.url}>
              <Card padding={0} className="flex h-full flex-col overflow-hidden">
                <div className="aspect-[4/3] bg-white">
                  {item.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element -- store images come from many hosts
                    <img src={item.imageUrl} alt="" className="h-full w-full object-contain p-4" loading="lazy" referrerPolicy="no-referrer" />
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-3 p-4">
                  <h3 className="line-clamp-2 text-sm font-semibold leading-snug">{item.title}</h3>
                  <div className="mt-auto flex items-end justify-between gap-3">
                    <PriceBlock price={item.price} compact />
                    {item.offer && item.price?.priced && (
                      <Button size="s" onClick={() => setBuying(item)}>
                        {t("buy")}
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
