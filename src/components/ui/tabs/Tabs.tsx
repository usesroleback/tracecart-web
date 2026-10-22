"use client";

import { KeyboardEvent, useRef } from "react";

export type TabItem<T extends string> = { id: T; label: string; count?: number };

/**
 * Design system Tabs, segmented variant (bundle.css .rb-tabs--seg L126-129):
 * a sunken track with the selected segment raised. role="tablist" with a
 * roving tabindex; ← → Home End move between tabs (07-components: "Tabs and
 * Menu use arrow keys"). The panel it controls is the caller's.
 */
export function SegmentedTabs<T extends string>({
  label,
  tabs,
  value,
  onChange,
  className = "",
}: {
  label: string;
  tabs: TabItem<T>[];
  value: T;
  onChange: (id: T) => void;
  className?: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = -1;
    if (e.key === "ArrowRight") next = (index + 1) % tabs.length;
    else if (e.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = tabs.length - 1;
    if (next < 0) return;
    e.preventDefault();
    onChange(tabs[next].id);
    refs.current[next]?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      className={`no-scrollbar inline-flex max-w-full overflow-x-auto rounded-[var(--radius-s)] border border-line-strong bg-surface-sunken p-[3px] ${className}`}
    >
      {tabs.map((tab, i) => {
        const selected = tab.id === value;
        return (
          <button
            key={tab.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={`inline-flex h-[34px] items-center gap-2 whitespace-nowrap rounded-[var(--radius-xs)] px-3 text-[15px] font-[580] transition-colors duration-[var(--duration-quick)] ease-[var(--ease-out)] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring ${
              selected ? "bg-surface-raised text-ink shadow-[0_0_0_1px_var(--color-line-strong)]" : "text-ink-muted hover:text-ink"
            }`}
          >
            {tab.label}
            {tab.count != null && <span className="text-[13px] font-[650] tabular-nums">{tab.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
