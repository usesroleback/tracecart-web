import GridShape from "@/components/common/GridShape";
import ThemeTogglerTwo from "@/components/common/ThemeTogglerTwo";

import { ThemeProvider } from "@/context/ThemeContext";
import { AuthProvider } from "@/components/auth/AuthProvider";
import Image from "next/image";
import { Link } from '@/i18n/navigation';

import React from "react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative p-6 bg-surface z-1 sm:p-0">
      <ThemeProvider>
        <div className="relative flex lg:flex-row w-full h-screen justify-center flex-col sm:p-0">
          <AuthProvider>{children}</AuthProvider>
          <div className="lg:w-1/2 w-full h-full bg-ink lg:grid items-center hidden">
            <div className="relative items-center justify-center  flex z-1">
              {/* <!-- ===== Common Grid Shape Start ===== --> */}
              <GridShape />
              <div className="flex flex-col items-center max-w-xs">
                <Link href="/" className="block mb-4">
                  <Image
                    width={48}
                    height={48}
                    src="/images/logo/terravia-symbol-white.svg"
                    alt="TraceCart"
                  />
                </Link>
                <p className="text-center text-white/60">
                  Sourcing et logistique, pour les corridors les plus difficiles.
                </p>
              </div>
            </div>
          </div>
          <div className="fixed bottom-6 right-6 z-50 hidden sm:block">
            <ThemeTogglerTwo />
          </div>
        </div>
      </ThemeProvider>
    </div>
  );
}
