"use client";

import { useRef, useState } from "react";
import { api } from "@/lib/apiClient";
import { TRACECART_API_URL } from "@/lib/apiBase";
import { DsUploadIcon } from "@/icons";
import { Order } from "@/lib/types";

/** Photos of the physical goods for a CUSTOMER_OWNED order — real uploads, not pasted URLs. */
export function OrderPhotoUploader({ order, onChanged }: { order: Order; onChanged: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      Array.from(files)
        .slice(0, 6)
        .forEach((file) => formData.append("photos", file));
      await api.postForm(`/orders/${order.id}/photos`, formData);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d'envoyer les photos");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      {order.photos.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {order.photos.map((photo) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={photo.id}
              src={`${TRACECART_API_URL}${photo.url}`}
              alt={photo.originalName ?? ""}
              className="h-14 w-14 flex-shrink-0 rounded-[var(--radius-s)] border border-line object-cover"
            />
          ))}
        </div>
      )}

      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-[var(--radius-m)] border border-dashed border-line-strong bg-surface-raised px-4 py-4 text-sm text-ink-muted hover:bg-surface-sunken">
        <DsUploadIcon />
        {uploading ? "Envoi..." : "Ajouter des photos de l'article"}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          disabled={uploading}
          onChange={(e) => handleFiles(e.target.files)}
        />
      </label>
      {error && <p className="mt-1.5 text-xs text-critical">{error}</p>}
    </div>
  );
}
