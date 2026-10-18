import Link from "next/link";
import { Logo } from "@/components/common/Logo";
import Button from "@/components/ui/button/Button";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-surface/90 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2">
          <Logo href={null} />
          <span className="font-bricolage text-[17px] font-[650] tracking-[-0.01em] text-ink">TraceCart</span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium text-ink-muted sm:flex">
          <a href="#how-it-works" className="hover:text-ink">
            How it works
          </a>
          <a href="#corridors" className="hover:text-ink">
            Corridors
          </a>
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/login" className="hidden text-sm font-medium text-ink-muted hover:text-ink sm:block">
            Sign in
          </Link>
          <Button href="#quote" size="s">
            Get a quote
          </Button>
        </div>
      </div>
    </header>
  );
}
