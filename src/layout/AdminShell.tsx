"use client";

import { SectionTabs } from "./SectionTabs";
import { useSidebar } from "@/context/SidebarContext";
import AppHeader from "@/layout/AppHeader";
import AppSidebar from "@/layout/AppSidebar";
import Backdrop from "@/layout/Backdrop";
import React from "react";
import { SetupBanner } from "@/components/tracecart/SetupGuide";

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();

  const mainContentMargin = isMobileOpen
    ? "ml-0"
    : isExpanded || isHovered
    ? "lg:ml-[240px]"
    : "lg:ml-[90px]";

  return (
    <div className="min-h-screen lg:flex">
      <AppSidebar />
      <Backdrop />
      <div className={`min-w-0 flex-1 transition-all  duration-300 ease-in-out ${mainContentMargin}`}>
        <AppHeader />
        {/* The ops console caps at container-wide (1440px); side margins 16 / 24 / 32 (system grid). */}
        <main className="@container/main px-4 py-6 mx-auto max-w-[1440px] sm:px-6 lg:px-8 lg:py-7">
          <SetupBanner />
          <SectionTabs />
          {children}
        </main>
      </div>
    </div>
  );
}
