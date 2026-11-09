import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { tintVar, type Tint } from "./images";

/** A department or collection: its photograph on a soft ground, and its name. */
export function CategoryCard({ href, name, note, image, tint, sizes, priority = false, className = "" }: { href: string; name: string; note?: string; image: string; tint: Tint; sizes: string; priority?: boolean; className?: string }) {
  return (
    <Link href={href} style={{ background: tintVar(tint) }} className={`st-tile flex h-full min-h-44 flex-col rounded-[var(--radius-m)] p-2 ${className}`}>
      <span className="relative block min-h-0 flex-1 overflow-hidden rounded-[var(--radius-s)]">
        <Image src={image} alt="" fill sizes={sizes} priority={priority} className="st-photo object-cover" />
      </span>
      <span className="flex items-baseline justify-between gap-2 px-2 pb-1 pt-2.5">
        <span className="font-semibold leading-snug text-ink">{name}</span>
        {note ? <span className="rb-mono-s shrink-0 text-ink-muted">{note}</span> : null}
      </span>
    </Link>
  );
}
