import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { ProductCard as Card } from "@/lib/store";
import { ProductCard } from "../ProductCard";
import { tintVar, type Tint } from "./images";

/** A large photograph with a heading, beside real products from the same department. */
export async function EditorialBanner({ id, title, href, image, tint, items, flip = false }: { id: string; title: string; href: string; image: string; tint: Tint; items: Card[]; flip?: boolean }) {
  const t = await getTranslations("store.home");
  return (
    <section aria-labelledby={id} style={{ background: tintVar(tint) }} className="mt-12 grid gap-3 rounded-[var(--hp-corner-panel)] p-3 sm:gap-4 sm:p-4 lg:grid-cols-2">
      <Link href={href} className={`st-tile relative block min-h-72 overflow-hidden rounded-[var(--radius-m)] ${flip ? "lg:order-2" : ""}`}>
        <Image src={image} alt="" fill sizes="(min-width: 1024px) 50vw, 100vw" className="st-photo object-cover" />
        <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
        <span className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-7">
          <h2 id={id} className="rb-headline max-w-[16ch] text-[28px] leading-[1.05] sm:text-[38px]">
            {title}
          </h2>
          <span className="mt-3 inline-block text-sm font-medium underline underline-offset-4">{t("shopThis")}</span>
        </span>
      </Link>
      <ul className="grid grid-cols-2 gap-3 sm:gap-4">
        {items.slice(0, 4).map((p) => (
          <li key={p.id}>
            <ProductCard product={p} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/** A wide campaign banner: words on a photograph's ground, and one way forward. */
export async function PromoBanner({ id, title, body, cta, href, image }: { id: string; title: string; body: string; cta: string; href: string; image: string }) {
  return (
    <section aria-labelledby={id} style={{ background: tintVar("sky") }} className="mt-12 grid items-center overflow-hidden rounded-[var(--hp-corner-panel)] md:grid-cols-[1fr_1fr]">
      <div className="px-6 py-8 sm:px-10">
        <h2 id={id} className="rb-headline max-w-[20ch] text-[26px] leading-[1.08] sm:text-[34px]">
          {title}
        </h2>
        <p className="mt-3 max-w-md text-ink-muted">{body}</p>
        <Link href={href} className="mt-5 inline-flex h-11 items-center rounded-[var(--radius-s)] bg-ink px-5 font-medium text-ink-inverse hover:opacity-90">
          {cta}
        </Link>
      </div>
      <div className="relative h-52 md:h-full md:min-h-64">
        <Image src={image} alt="" fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
      </div>
    </section>
  );
}
