import GridShape from "@/components/common/GridShape";
import Image from "next/image";
import Link from "next/link";
import React from "react";

export default function NotFound() {
  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen p-6 overflow-hidden z-1">
      <GridShape />
      <div className="mx-auto w-full max-w-[242px] text-center sm:max-w-[472px]">
        <h1 className="sq-display-l mb-8">
          ERROR
        </h1>

        <Image
          src="/images/error/404.svg"
          alt="404"
          className="dark:hidden"
          width={472}
          height={152}
        />
        <Image
          src="/images/error/404-dark.svg"
          alt="404"
          className="hidden dark:block"
          width={472}
          height={152}
        />

        <p className="mt-10 mb-6 text-base text-ink-muted sm:text-lg">
          Cette page est introuvable.
        </p>

        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-[var(--radius-s)] border border-line-strong bg-surface-raised px-5 py-3.5 text-sm font-medium text-ink hover:bg-surface-sunken"
        >
          Retour à l&apos;accueil
        </Link>
      </div>
      {/* <!-- Footer --> */}
      <p className="absolute text-sm text-center text-ink-muted -translate-x-1/2 bottom-6 left-1/2">
        &copy; {new Date().getFullYear()} - TraceCart
      </p>
    </div>
  );
}
