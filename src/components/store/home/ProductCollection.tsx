import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import type { ProductCard as Card } from "@/lib/store";
import { ProductCard, ProductList } from "../ProductCard";
import { ProductCarousel } from "./ProductCarousel";

/** Products under a heading, as a carousel, a grid or a mosaic. Nothing at all when empty. */
export async function ProductCollection({
  id,
  title,
  lead,
  items,
  href,
  action,
  layout = "grid",
}: {
  id: string;
  title: string;
  lead?: string;
  items?: Card[];
  href?: string;
  action?: ReactNode;
  layout?: "grid" | "carousel" | "mosaic";
}) {
  if (!items?.length) return null;
  const t = await getTranslations("store.home");
  return (
    <section aria-labelledby={id} className="mt-12">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div>
          <h2 id={id} className="rb-title-l">
            {title}
          </h2>
          {lead ? <p className="mt-1 text-sm text-ink-muted">{lead}</p> : null}
        </div>
        {href ? (
          <Link href={href} className="text-sm font-medium text-ink underline">
            {t("seeAll")}
          </Link>
        ) : (
          action
        )}
      </div>
      {layout === "carousel" ? (
        <ProductCarousel label={title}>
          {items.map((p) => (
            <li key={p.id} className="w-[46%] shrink-0 snap-start sm:w-[30%] lg:w-[19%]">
              <ProductCard product={p} />
            </li>
          ))}
        </ProductCarousel>
      ) : layout === "mosaic" ? (
        <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {items.slice(0, 9).map((p, i) => (
            <li key={p.id} className={i === 0 ? "col-span-2 row-span-2" : ""}>
              <ProductCard product={p} />
            </li>
          ))}
        </ul>
      ) : (
        <ProductList products={items} />
      )}
    </section>
  );
}
