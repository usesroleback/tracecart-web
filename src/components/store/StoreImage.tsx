import Image from "next/image";
import { OPTIMISED_IMAGE_HOSTS } from "@/lib/store";

const optimised = (url: string) => {
  try {
    return OPTIMISED_IMAGE_HOSTS.includes(new URL(url).hostname);
  } catch {
    return false;
  }
};

/**
 * A product photo in a square frame. Hosts next/image is allowed to fetch
 * (NEXT_PUBLIC_IMAGE_HOSTS) are resized and sent as AVIF or WebP; any other
 * link is shown as it is, lazily, so a merchandiser's link never breaks a page.
 */
export function StoreImage({
  url,
  alt,
  sizes,
  priority = false,
  className = "",
}: {
  url: string | null | undefined;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  return (
    <div className={`relative aspect-square overflow-hidden bg-surface-sunken ${className}`}>
      {url ? (
        optimised(url) ? (
          <Image src={url} alt={alt} fill sizes={sizes} priority={priority} className="object-contain" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={alt} loading={priority ? "eager" : "lazy"} decoding="async" className="absolute inset-0 size-full object-contain" />
        )
      ) : (
        <span aria-hidden className="absolute inset-0 grid place-items-center text-ink-muted">
          <svg viewBox="0 0 24 24" className="size-10" fill="none" stroke="currentColor" strokeWidth="1.4">
            <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.5-2.5 2.5-2.5Z" strokeLinejoin="round" />
          </svg>
        </span>
      )}
    </div>
  );
}
