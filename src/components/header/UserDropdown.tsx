"use client";
import { useClerk } from "@clerk/nextjs";
import { useLocale } from "next-intl";

import React, { useState } from "react";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { useSession } from "@/context/SessionContext";
import { SessionUser } from "@/lib/types";

function roleLabel(user: SessionUser): string {
  if (user.role === "SUPER_ADMIN") {
    return user.hub ? `Gérant · ${user.hub.city}` : "Gérant";
  }
  return "Partenaire logistique";
}

export default function UserDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const { signOut } = useClerk();
  const locale = useLocale();
  const user = useSession();

  function toggleDropdown(e: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
    e.stopPropagation();
    setIsOpen((prev) => !prev);
  }

  function closeDropdown() {
    setIsOpen(false);
  }

  async function handleLogout() {
    closeDropdown();
    await signOut({ redirectUrl: `/${locale}/login` });
  }

  const initial = user.name.charAt(0).toUpperCase();

  return (
    <div className="relative">
      <button
        onClick={toggleDropdown}
        className="flex items-center text-ink dropdown-toggle"
      >
        <span className="mr-3 flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-ink font-semibold text-ink-inverse">
          {initial}
        </span>
        <span className="mr-1 hidden text-left sm:block">
          <span className="block font-medium text-sm">{user.name}</span>
          <span className="block text-xs text-ink-muted">
            {roleLabel(user)}
          </span>
        </span>
        <svg
          className={`stroke-ink-muted transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
          width="18"
          height="20"
          viewBox="0 0 18 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M4.3125 8.65625L9 13.3437L13.6875 8.65625"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute right-0 mt-[17px] flex w-[260px] flex-col rounded-[var(--radius-m)] border border-line bg-surface-raised p-3 shadow-[var(--shadow-2)]"
      >
        <div className="px-1 pb-3">
          <span className="block font-medium text-ink text-sm">{user.name}</span>
          <span className="mt-0.5 block text-xs text-ink-muted">{user.email}</span>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 rounded-[var(--radius-s)] border-t border-line px-3 py-2 pt-4 text-left font-medium text-ink text-sm hover:bg-surface-sunken"
        >
          Déconnexion
        </button>
      </Dropdown>
    </div>
  );
}
