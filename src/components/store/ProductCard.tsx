import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { ProductCard as Card } from "@/lib/store";
import { findHref } from "@/components/site/header/links";
import { StoreImage } from "./StoreImage";
import { Price } from "./Price";
import { Rating } from "./Rating";
import { SaveCompare } from "./SaveCompare";

/**
 * A product in a grid (ADR-086): the photo, the title, approved reviews if any,
 * and the price or "on request". Stock, seller and delivery are for the product page.
 */
export async function ProductCard({ product, priority = false }: { product: Card; priority?: boolean }) {
  const t = await getTranslations("store");
  return (
    <article className="st-card group relative flex h-full flex-col overflow-hidden rounded-[var(--radius-m)] border border-line bg-surface-raised hover:shadow-[var(--shadow-1)]">
      <div className="relative">
        <StoreImage url={product.image?.url} alt={product.image?.alt ?? product.title} sizes="(min-width: 1280px) 280px, (min-width: 768px) 30vw, 50vw" priority={priority} />
        <div className="absolute right-2 top-2">
          <SaveCompare slug={product.slug} sku={product.sku} title={product.title} />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3 sm:p-4">
        <h3 className="line-clamp-2 text-[15px] font-medium leading-snug text-ink">
          {/* The whole card is the link: the title's ::after covers it. */}
          <Link href={`/p/${product.slug}`} className="after:absolute after:inset-0 after:z-10 focus-visible:outline-none group-focus-within:underline">
            {product.title}
          </Link>
        </h3>
        {product.rating ? <Rating average={product.rating.average} count={product.rating.count} /> : null}
        <div className="mt-auto flex flex-col gap-2 pt-1">
          {product.price ? (
            <Price amountMinor={product.price.amountMinor} currency={product.price.currency} compareAtMinor={product.compareAtMinor} size="s" />
          ) : (
            <>
              <p className="text-base font-semibold text-ink">{t("card.onRequest")}</p>
              <Link href={findHref(product.title)} className="relative z-20 self-start text-sm font-medium text-ink underline underline-offset-4">
                {t("card.requestQuote")}
              </Link>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

export function ProductGrid({ children }: { children: React.ReactNode }) {
  return <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">{children}</ul>;
}

export async function ProductList({ products, priorityFirst = 0 }: { products: Card[]; priorityFirst?: number }) {
  return (
    <ProductGrid>
      {products.map((p, i) => (
        <li key={p.id}>
          <ProductCard product={p} priority={i < priorityFirst} />
        </li>
      ))}
    </ProductGrid>
  );
}
