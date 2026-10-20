"use client";
import React, { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import { api } from "@/lib/apiClient";
import { Notification, Paginated } from "@/lib/types";
import { useFormat } from "@/lib/format";

const POLL_INTERVAL_MS = 15000;

export default function NotificationDropdown() {
  const t = useTranslations("common.notifications");
  const f = useFormat();
  const [isOpen, setIsOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  async function refreshCount() {
    try {
      const res = await api.get<{ count: number }>("/notifications/unread-count");
      setCount(res.count);
    } catch {
      // best-effort; ignore transient failures
    }
  }

  useEffect(() => {
    let cancelled = false;
    const poll = () =>
      api.get<{ count: number }>("/notifications/unread-count").then(
        (res) => !cancelled && setCount(res.count),
        () => {} // best-effort polling; ignore transient failures
      );
    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  async function toggleDropdown() {
    const next = !isOpen;
    setIsOpen(next);
    if (next) {
      try {
        const result = await api.get<Paginated<Notification>>("/notifications?limit=15");
        setNotifications(result.items.filter((n) => n.channel === "IN_APP"));
      } catch {
        // ignore
      }
    }
  }

  function closeDropdown() {
    setIsOpen(false);
  }

  async function markRead(id: string) {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, status: "READ" } : n)));
      refreshCount();
    } catch {
      // ignore
    }
  }

  return (
    <div className="relative">
      <button
        className="relative dropdown-toggle flex items-center justify-center text-ink-muted transition-colors bg-surface-raised border border-line rounded-full hover:text-ink h-11 w-11 hover:bg-surface-sunken"
        onClick={toggleDropdown}
        aria-label={t("button", { count })}
      >
        {count > 0 && (
          <span className="absolute right-0 top-0.5 z-10 flex h-4 min-w-4 items-center justify-center rounded-full bg-signal px-1 text-[10px] font-semibold text-black">
            {count > 9 ? "9+" : count}
          </span>
        )}
        <svg className="fill-current" width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M10.75 2.29248C10.75 1.87827 10.4143 1.54248 10 1.54248C9.58583 1.54248 9.25004 1.87827 9.25004 2.29248V2.83613C6.08266 3.20733 3.62504 5.9004 3.62504 9.16748V14.4591H3.33337C2.91916 14.4591 2.58337 14.7949 2.58337 15.2091C2.58337 15.6234 2.91916 15.9591 3.33337 15.9591H4.37504H15.625H16.6667C17.0809 15.9591 17.4167 15.6234 17.4167 15.2091C17.4167 14.7949 17.0809 14.4591 16.6667 14.4591H16.375V9.16748C16.375 5.9004 13.9174 3.20733 10.75 2.83613V2.29248ZM14.875 14.4591V9.16748C14.875 6.47509 12.6924 4.29248 10 4.29248C7.30765 4.29248 5.12504 6.47509 5.12504 9.16748V14.4591H14.875ZM8.00004 17.7085C8.00004 18.1228 8.33583 18.4585 8.75004 18.4585H11.25C11.6643 18.4585 12 18.1228 12 17.7085C12 17.2943 11.6643 16.9585 11.25 16.9585H8.75004C8.33583 16.9585 8.00004 17.2943 8.00004 17.7085Z"
            fill="currentColor"
          />
        </svg>
      </button>
      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute -right-[240px] mt-[17px] flex h-[480px] w-[350px] flex-col rounded-[var(--radius-m)] border border-line bg-surface-raised p-3 shadow-[var(--shadow-2)] sm:w-[361px] lg:right-0"
      >
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-line">
          <h5 className="rb-title text-[16px]">{t("title")}</h5>
        </div>
        <ul className="flex flex-col h-auto overflow-y-auto custom-scrollbar">
          {notifications.length === 0 && (
            <li className="px-2 py-6 text-center text-sm text-ink-muted">
              {t("empty")}
            </li>
          )}
          {notifications.map((n) => (
            <li key={n.id}>
              <DropdownItem
                onItemClick={() => markRead(n.id)}
                className={`flex flex-col gap-1 rounded-[var(--radius-s)] border-b border-line p-3 px-3.5 py-3 hover:bg-surface-sunken ${
                  n.status === "READ" ? "opacity-60" : ""
                }`}
              >
                <span className="font-medium text-ink">{n.title}</span>
                <span className="text-xs text-ink-muted line-clamp-2">{n.body}</span>
                <span className="text-xs text-ink-muted">{f.ago(n.createdAt)}</span>
              </DropdownItem>
            </li>
          ))}
        </ul>
      </Dropdown>
    </div>
  );
}
