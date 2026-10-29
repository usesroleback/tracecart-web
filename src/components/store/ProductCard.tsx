import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { ProductCard as Card } from "@/lib/store";
import { StoreImage } from "./StoreImage";
import { Price } from "./Price";
import { AvailabilityNote } from "./AvailabilityNote";

export async function ProductCard({ product, priority = false }: { product: Card; priority?: boolean }) {
  const t = await getTranslations("store");
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-[var(--radius-m)] border border-line bg-surface-raised transition-shadow hover:shadow-[var(--shadow-1)]">
      <StoreImage url={product.image?.url} alt={product.image?.alt ?? product.title} sizes="(min-width: 1280px) 280px, (min-width: 768px) 30vw, 50vw" priority={priority} />
      <div className="flex flex-1 flex-col gap-2 p-3 sm:p-4">
        {product.brand ? <p className="rb-overline text-ink-muted">{product.brand.name}</p> : null}
        <h3 className="line-clamp-3 text-[15px] font-medium leading-snug text-ink">
          {/* The whole card is the link: the title's ::after covers it. */}
          <Link href={`/p/${product.slug}`} className="after:absolute after:inset-0 after:z-10 focus-visible:outline-none group-focus-within:underline">
            {product.title}
          </Link>
        </h3>
        <div className="mt-auto flex flex-col gap-2 pt-1">
          <Price amountMinor={product.price.amountMinor} currency={product.price.currency} compareAtMinor={product.compareAtMinor} size="s" />
          <AvailabilityNote availability={product.availability} />
          {product.variantCount > 1 ? <p className="text-xs text-ink-muted">{t("card.versions", { count: product.variantCount })}</p> : null}
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
