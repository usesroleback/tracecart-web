"use client";

import { useId, useState, type DragEvent } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { PHOTO_TYPES, setPendingPhoto } from "@/lib/pendingPhoto";

/** Drop or choose a photo here; the AI search opens with it, ready for a description. */
export function PhotoDrop({ tone = "light" }: { tone?: "light" | "dark" }) {
  const t = useTranslations("store.home");
  const router = useRouter();
  const id = useId();
  const [over, setOver] = useState(false);
  const [wrong, setWrong] = useState(false);

  function take(file: File | undefined) {
    if (!file) return;
    if (!PHOTO_TYPES.includes(file.type)) return setWrong(true);
    setPendingPhoto(file);
    router.push("/s/ai");
  }

  function drop(e: DragEvent) {
    e.preventDefault();
    setOver(false);
    take(e.dataTransfer.files[0]);
  }

  const colors = tone === "dark" ? "border-white/35 text-[var(--hp-on-dark)] hover:border-white" : "border-line-strong text-ink hover:border-ink";
  return (
    <div>
      <input id={id} type="file" accept={PHOTO_TYPES.join(",")} className="peer sr-only" onChange={(e) => take(e.target.files?.[0])} />
      <label
        htmlFor={id}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={drop}
        className={`flex cursor-pointer items-center justify-center gap-3 rounded-[var(--radius-s)] border border-dashed px-4 py-3.5 text-sm font-medium transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--color-focus-ring)] ${colors} ${over ? "bg-[var(--store-tint-mint)] !text-ink" : ""}`}
      >
        <svg viewBox="0 0 20 20" aria-hidden className="size-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M3 7h3l1.5-2h5L14 7h3v9H3z" strokeLinejoin="round" />
          <circle cx="10" cy="11" r="3" />
        </svg>
        {t("dropPhoto")}
      </label>
      {wrong ? (
        <p role="alert" className={`mt-2 text-sm ${tone === "dark" ? "text-[var(--hp-on-dark)]" : "text-critical"}`}>
          {t("dropWrongType")}
        </p>
      ) : null}
    </div>
  );
}
